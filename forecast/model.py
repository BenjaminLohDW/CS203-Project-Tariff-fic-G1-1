import os
import pandas as pd
import numpy as np
import networkx as nx
import xgboost as xgb
import requests
from typing import Optional
from sklearn.model_selection import train_test_split


class TariffForecaster:
    def __init__(self):
        self.model = None
        self.graph = nx.Graph()
        self.agreement_url = os.getenv('AGREEMENT_MS_BASE', 'http://agreement:5006')
        self.country_url = os.getenv('COUNTRY_MS_BASE', 'http://country:5005')
        self.tariff_url = os.getenv('TARIFF_MS_BASE', 'http://tariff:5004')
        self.product_url = os.getenv('PRODUCT_MS_BASE', 'http://product:5002')

        self.request_timeout = int(os.getenv('REQUEST_TIMEOUT', '10'))
        self.min_historical_years = int(os.getenv('MODEL_MIN_HISTORICAL_YEARS', '2'))
        self.graph_strategy = os.getenv('GRAPH_STRATEGY', 'us_centric')
        
        self.n_estimators = int(os.getenv('MODEL_N_ESTIMATORS', '200'))
        self.learning_rate = float(os.getenv('MODEL_LEARNING_RATE', '0.1'))
        self.max_depth = int(os.getenv('MODEL_MAX_DEPTH', '3'))

    # old - relastionship btwn countries
    # def init_graph(self):
    #     #sample weights between countries
    #     self.graph.add_edge("US", "CN", weight = -0.7) # negative weight indicates high tariff
    #     self.graph.add_edge("US", "SG", weight = 0.3)
    #     self.graph.add_edge("SG", "CN", weight = 0.5)

    # =================================== GRAPH INITIALISATION ===================================
    def init_graph(self):
        """
        Build graph dynamically from Country service using US-centric approach
        1. Fetch all countries from Country service
        2. Generate US-centric pairs
        3. Fetch relationship weights for each pair
        4. Add edges to graph
        """
        print("Initializing country relationship graph (US-centric)...")
        
        try:
            # Fetch all countries from Country service
            countries = self.fetch_all_countries()
            
            if not countries:
                print("No countries fetched. Using hardcoded pairs as fallback.")
                self.init_graph_fallback()
                return
            
            # Extract country codes
            country_codes = [c['code'] for c in countries if c.get('code')]
            print(f"✅ Fetched {len(country_codes)} countries from Country service")
            
            # Generate US-centric pairs
            pairs_to_fetch = self.generate_us_centric_pairs(country_codes)
            
            # Fetch relationship weight for each pair
            print(f"📊 Fetching weights for {len(pairs_to_fetch)} country pairs...")
            edges_added = 0
            
            for imp, exp in pairs_to_fetch:
                try:
                    weight = self.fetch_relationship_weight(imp, exp)
                    self.graph.add_edge(imp, exp, weight=weight)
                    edges_added += 1
                    
                    # Progress indicator every 10 pairs
                    if edges_added % 10 == 0:
                        print(f"   ... {edges_added}/{len(pairs_to_fetch)} pairs processed")
                        
                except Exception as e:
                    print(f"⚠️ Failed to add edge {imp}-{exp}: {e}")
            
            print(f"✅ Graph initialized with {edges_added} edges from {len(country_codes)} countries")
            
        except Exception as e:
            print(f"❌ Failed to initialize graph: {e}")
            print("⚠️ Falling back to hardcoded pairs")
            self.init_graph_fallback()


    def fetch_all_countries(self) -> list[dict]:
        """
        Fetch all countries from Country service
        Returns: List of country dicts with 'code', 'name', 'country_id'
        Example: [{'country_id': 153, 'name': 'Singapore', 'code': 'SG'}, ...]
        """
        try:
            resp = requests.get(
                f"{self.country_url}/countries/all",
                timeout=self.request_timeout
            )
            
            if resp.status_code != 200:
                print(f"Country service returned {resp.status_code}")
                return []
            
            data = resp.json()
            
            if data.get('code') != 200:
                print(f"Country service error: {data}")
                return []
            
            countries = data.get('data', [])
            
            # Filter out countries without codes
            valid_countries = [c for c in countries if c.get('code')]
            
            print(f"✅ Fetched {len(valid_countries)} valid countries")
            return valid_countries
        
        except requests.exceptions.Timeout:
            print(f"❌ Country service timeout after {self.request_timeout}s")
            return []
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to Country service at {self.country_url}")
            return []
        except Exception as e:
            print(f"❌ Failed to fetch countries: {e}")
            return []


    def generate_us_centric_pairs(self, country_codes: list[str]) -> list[tuple[str, str]]:
        """
        Generate country pairs with US as the primary focus
        Strategy:
        1. All US <-> Other country pairs (highest priority)
        2. Major trading partners with each other
        3. Regional pairs (ASEAN, etc.)
        
        Returns: List of tuples (country_a, country_b) sorted alphabetically
        """
        pairs = set()
        
        # Major trading partners (based on real-world trade volumes)
        major_partners = {
            'CN', 'CA', 'MX', 'JP', 'DE', 'KR', 'GB', 'IN', 'FR', 'IT',
            'TW', 'SG', 'MY', 'VN', 'TH', 'ID', 'BR', 'AU', 'NL', 'CH'
        }
        
        # ASEAN countries (regional trade important)
        asean = {'SG', 'MY', 'TH', 'ID', 'VN', 'PH', 'MM', 'KH', 'LA', 'BN'}
        
        # 1. US with ALL countries (top priority)
        us_pairs = 0
        for code in country_codes:
            if code != 'US' and code:
                pairs.add(tuple(sorted(['US', code])))
                us_pairs += 1
        
        print(f"Generated {us_pairs} US-centric pairs")
        
        # 2. Major trading partners with each other
        available_majors = major_partners.intersection(set(country_codes))
        major_pairs = 0
        for i, code1 in enumerate(sorted(available_majors)):
            for code2 in sorted(list(available_majors))[i+1:]:
                if code1 != code2:
                    pairs.add(tuple(sorted([code1, code2])))
                    major_pairs += 1
        
        print(f"Generated {major_pairs} major trading partner pairs")
        
        # 3. ASEAN regional pairs
        available_asean = asean.intersection(set(country_codes))
        asean_pairs = 0
        for i, code1 in enumerate(sorted(available_asean)):
            for code2 in sorted(list(available_asean))[i+1:]:
                if code1 != code2:
                    pair = tuple(sorted([code1, code2]))
                    if pair not in pairs:  # Don't duplicate
                        pairs.add(pair)
                        asean_pairs += 1
        
        print(f"   📍 Generated {asean_pairs} ASEAN regional pairs")
        print(f"   📋 Total: {len(pairs)} unique country pairs")
        
        return sorted(list(pairs))


    def init_graph_fallback(self):
        """
        Fallback to hardcoded common pairs if Country service is unavailable
        """
        print("⚠️ Using hardcoded country pairs (fallback mode)")
        
        common_pairs = [
            # US with major partners
            ("US", "CN"), ("US", "CA"), ("US", "MX"), ("US", "JP"),
            ("US", "DE"), ("US", "KR"), ("US", "GB"), ("US", "SG"),
            ("US", "IN"), ("US", "FR"), ("US", "IT"), ("US", "TW"),
            # Singapore with major partners
            ("SG", "CN"), ("SG", "MY"), ("SG", "IN"), ("SG", "TH"),
            ("SG", "JP"), ("SG", "KR"), ("SG", "ID"), ("SG", "VN"),
            # China with major partners
            ("CN", "JP"), ("CN", "KR"), ("CN", "DE"), ("CN", "IN"),
            ("CN", "MY"), ("CN", "TH"), ("CN", "VN"),
            # Other important pairs
            ("CA", "MX"), ("JP", "KR"), ("DE", "FR"), ("GB", "FR"),
            ("MY", "TH"), ("MY", "ID"), ("TH", "VN")
        ]
        
        edges_added = 0
        for imp, exp in common_pairs:
            try:
                weight = self.fetch_relationship_weight(imp, exp)
                self.graph.add_edge(imp, exp, weight=weight)
                edges_added += 1
            except Exception as e:
                print(f"⚠️ Failed to add fallback edge {imp}-{exp}: {e}")
                # Add with neutral weight as last resort
                self.graph.add_edge(imp, exp, weight=0.0)
                edges_added += 1
        
        print(f"Fallback graph initialized with {edges_added} edges")


    # =================================== RELATIONSHIP WEIGHT ===================================
    def fetch_relationship_weight(self, importer, exporter, as_of_date=None):
        """
        Fetch relationship weight from Agreement service, fallback to Country service
        
        Args:
            importer: Importer country code (e.g., 'US')
            exporter: Exporter country code (e.g., 'CN')
            as_of_date: Date in 'YYYY-MM-DD' format (defaults to today)
        
        Returns: 
            float between -1.0 and 1.0
            Positive = good relationship (lower tariffs)
            Negative = poor relationship (higher tariffs)
        """
                
        if as_of_date is None:
            as_of_date = pd.Timestamp.now().strftime('%Y-%m-%d')
        
        try:
            # Try Agreement service first
            resp = requests.get(
                f"{self.agreement_url}/agreements/active",
                params={
                    "importer": importer,
                    "exporter": exporter,
                    "on": as_of_date
                },
                timeout=5
            )
            
            if resp.status_code == 200 and resp.json():
                agreements = resp.json()
                # Convert agreement data to weight
                return self.agreements_to_weight(agreements)
        except Exception as e:
            print(f"Agreement lookup failed: {e}")
        
        # Fallback to Country relations if agreements dont work
        try:
            resp = requests.get(
                f"{self.country_url}/countries/relation/current",
                params={"a": importer, "b": exporter},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()["data"]
                return data.get("weight", 0.0)
        except Exception as e:
            print(f"Country relation lookup failed: {e}")
        
        return 0.0  # Neutral if no data


    def agreements_to_weight(self, agreements):
        """
        Convert agreements to a relationship weight score
        Logic: 
        - override with low values = good relationship (positive weight)
        - surcharge = bad relationship (negative weight)
        - multiplier > 1 = bad relationship (negative weight)
        """
        if not agreements:
            return 0.0
        
        weights = []
        for ag in agreements:
            kind = ag.get('kind')
            value = float(ag.get('value', 0))
            
            if kind == 'override':
                # Lower override = better relationship
                # Assume typical tariff is 15%, normalize to [-1, 1]
                weight = 1.0 - (value / 0.15)  # 0% = 1.0, 15% = 0, 30% = -1.0
            elif kind == 'surcharge':
                # Surcharges are bad (negative weight)
                weight = -min(value / 0.10, 1.0)  # Cap at -1.0
            elif kind == 'multiplier':
                # Multiplier > 1 is bad, < 1 is good
                weight = 1.0 - value  # 0.5x = +0.5, 1.0x = 0, 1.5x = -0.5
            else:
                weight = 0.0
            
            weights.append(np.clip(weight, -1.0, 1.0))
        
        # Average all active agreements
        return np.mean(weights)


    # def get_relative_score(self, import_country, export_country):
    #     try:
    #         # graph -> US:{CN:{weight:-0.7}, SG:{weight: 0.3}} ; dict of list of neighbors and their weights
    #         return self.graph[import_country][export_country]["weight"]
    #     except KeyError:
    #         return 0.0  # default neutral score if no direct edge


    def get_relative_score(self, import_country: str, export_country: str) -> float:
        """
        Get relationship score from graph with lazy loading
        
        If pair not in graph, fetch it on-demand and cache
        This enables efficient startup + complete coverage
        """
        # Normalize country codes
        import_country = import_country.strip().upper()
        export_country = export_country.strip().upper()
        
        try:
            # Try to get from graph (cached)
            return self.graph[import_country][export_country]["weight"]
        except KeyError:
            # Not in graph - fetch and cache it
            print(f"   🔄 Lazy loading relationship: {import_country}-{export_country}")
            weight = self.fetch_relationship_weight(import_country, export_country)
            self.graph.add_edge(import_country, export_country, weight=weight)
            return weight


# ========== PRODUCT SERVICE METHODS ==========
    def resolve_hs_code(self, product_name: str):
        """
        Resolve product name to HS code using Product service
        
        Args:
            product_name: Product description (e.g., "smartphones")
        
        Returns:
            HS code string (e.g., "85171300") or None if not found
        """
        try:
            resp = requests.post(
                f"{self.product_url}/api/v1/hs-code/search",
                json={"query": product_name},
                headers={"Content-Type": "application/json"},
                timeout=self.request_timeout
            )
            
            if resp.status_code != 200:
                print(f"⚠️ Product service returned {resp.status_code} for '{product_name}'")
                return None
            
            data = resp.json()
            
            if not data.get('results') or len(data['results']) == 0:
                print(f"⚠️ No HS code found for product '{product_name}'")
                return None
            
            # Get top result
            top_result = data['results'][0]
            hs_code = top_result.get('subheading', '').replace('.', '')
            
            # Pad to 8 digits (Product returns 6-digit, DB uses 8-digit)
            while len(hs_code) < 8:
                hs_code += '0'
            
            print(f"   ✅ Resolved '{product_name}' to HS code {hs_code}")
            return hs_code
            
        except requests.exceptions.Timeout:
            print(f"❌ Product service timeout for '{product_name}'")
            return None
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to Product service at {self.product_url}")
            return None
        except Exception as e:
            print(f"❌ Failed to resolve HS code for '{product_name}': {e}")
            return None


# ========== TARIFF DATA FETCHING METHODS ==========
    def fetch_historical_tariffs(
        self, hs_code: str, importer: str, exporter: str, start_date: pd.Timestamp, end_date: pd.Timestamp
    ) -> pd.DataFrame:
        """
        Fetch historical tariff rates from Tariff service
        
        Args:
            hs_code: HS code (e.g., '85171300')
            importer: Importer country code (e.g., 'US')
            exporter: Exporter country code (e.g., 'CN')
            start_date: Start date for historical data
            end_date: End date for historical data
        
        Returns: 
            DataFrame with columns ['date', 'tariff_rate']
            Monthly granularity
        """
        try:
            # Normalize inputs
            hs_code = hs_code.strip()
            importer = importer.strip().upper()
            exporter = exporter.strip().upper()
            
            resp = requests.get(
                f"{self.tariff_url}/api/tariffs",
                params={
                    "hs_code": hs_code,
                    "importer": importer,
                    "exporter": exporter
                },
                timeout=self.request_timeout
            )
            
            if resp.status_code != 200:
                print(f"⚠️ Tariff service returned {resp.status_code} for {hs_code} {importer}-{exporter}")
                return pd.DataFrame(columns=['date', 'tariff_rate'])
            
            tariffs = resp.json()
            
            if not tariffs or not isinstance(tariffs, list):
                print(f"⚠️ No tariffs found for {hs_code} {importer}-{exporter}")
                return pd.DataFrame(columns=['date', 'tariff_rate'])
            
            # Convert tariff records to monthly time series
            records = []
            
            for t in tariffs:
                try:
                    start = pd.Timestamp(t['start_date'])
                    end = pd.Timestamp(t['end_date'])
                    
                    # Handle different rate field names
                    rate = None
                    if 'rate' in t:
                        rate = float(t['rate'])
                    elif 'tariff_rate' in t:
                        rate = float(t['tariff_rate'])
                    elif 'ad_valorem_rate' in t:
                        rate = float(t['ad_valorem_rate'])
                    
                    if rate is None:
                        continue
                    
                    # Generate yearly entries for this tariff period
                    years = pd.date_range(start, end, freq='YS')
                    
                    for year in years:
                        if start_date <= year <= end_date:
                            records.append({
                                'date': year,
                                'tariff_rate': rate
                            })
                            
                except (KeyError, ValueError, TypeError) as e:
                    print(f"   ⚠️ Skipping malformed tariff record: {e}")
                    continue
            
            if not records:
                print(f"⚠️ No valid tariff records in date range for {hs_code}")
                return pd.DataFrame(columns=['date', 'tariff_rate'])
            
            # Create DataFrame and clean up
            df = pd.DataFrame(records)
            df = df.sort_values('date').reset_index(drop=True)
            
            # Remove duplicates (keep last if multiple rates for same month)
            df = df.drop_duplicates(subset=['date'], keep='last')
            
            print(f"   ✅ Fetched {len(df)} years of tariff data for {hs_code} {importer}-{exporter}")
            return df
        
        except requests.exceptions.Timeout:
            print(f"❌ Tariff service timeout after {self.request_timeout}s")
            return pd.DataFrame(columns=['date', 'tariff_rate'])
        except requests.exceptions.ConnectionError:
            print(f"❌ Cannot connect to Tariff service at {self.tariff_url}")
            return pd.DataFrame(columns=['date', 'tariff_rate'])
        except Exception as e:
            print(f"❌ Failed to fetch historical tariffs: {e}")
            return pd.DataFrame(columns=['date', 'tariff_rate'])


    def get_recent_tariff_rates(
        self, hs_code: str, importer: str, exporter: str, years: int = 4
    ) -> list[float]:
        """
        Get last N years of tariff rates
        Returns: List of tariff rates (most recent last)
        """
        end_date = pd.Timestamp.now()
        start_date = end_date - pd.DateOffset(years=years)
        
        df = self.fetch_historical_tariffs(hs_code, importer, exporter, start_date, end_date)
        
        if df.empty:
            return []
        
        return df['tariff_rate'].tolist()
    

# ========== MODEL TRAINING METHODS ==========
    def train(
        self, hs_code: str = "85171300", importer: str = "US", exporter: str = "CN"
    ):
        """
        Train XGBoost regression model on historical tariff data
        
        Features:
        - lag1: Previous year's tariff rate
        - lag2: Tariff rate 2 years ago
        - rel_score: Country relationship score from graph
        
        Target:
        - Current year's tariff rate
        
        Falls back to mock data if insufficient real data available
        """
        print(f"🎓 Training model on {hs_code} {importer}-{exporter}...")
        
        # Fetch 10 years of historical data for training
        end_date = pd.Timestamp.now()
        start_date = end_date - pd.DateOffset(years=10)
        
        df = self.fetch_historical_tariffs(hs_code, importer, exporter, start_date, end_date)
        
        # Check if we have enough data
        if len(df) < self.min_historical_years:
            print(f"⚠️ Only {len(df)} years of data. Need {self.min_historical_years}+.")
            print("⚠️ Falling back to mock data for training")
            self.train_on_mock_data()
            return
        
        # Get relationship score for this country pair
        rel_score = self.get_relative_score(importer, exporter)
        print(f"   📊 Relationship score {importer}-{exporter}: {rel_score:.2f}")
        
        df['rel_score'] = rel_score
        
        # Create lagged features for time series prediction
        df['lag1'] = df['tariff_rate'].shift(1)  # Previous year
        df['lag2'] = df['tariff_rate'].shift(2)  # 2 years ago
        
        # Drop rows with NaN (first 2 rows after shifting)
        df = df.dropna()
        
        if len(df) < 3:
            print(f"⚠️ Only {len(df)} rows after creating lags. Need 3+.")
            print("⚠️ Falling back to mock data")
            self.train_on_mock_data()
            return
        
        # Prepare features (X) and target (y)
        X = df[['lag1', 'lag2', 'rel_score']]
        y = df['tariff_rate']
        
        # Split: 80% train, 20% test (time series, no shuffle)
        split_idx = int(len(df) * 0.8)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        print(f"   📊 Training set: {len(X_train)} samples")
        print(f"   📊 Test set: {len(X_test)} samples")
        
        # Train XGBoost model
        self.model = xgb.XGBRegressor(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            random_state=42,
            objective='reg:squarederror'
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        # Calculate RMSE
        train_pred = self.model.predict(X_train)
        test_pred = self.model.predict(X_test)
        train_rmse = np.sqrt(np.mean((y_train - train_pred) ** 2))
        test_rmse = np.sqrt(np.mean((y_test - test_pred) ** 2))
        
        print(f"   ✅ Model trained successfully!")
        print(f"   📈 Train R²: {train_score:.3f}, RMSE: {train_rmse:.2f}%")
        print(f"   📈 Test R²: {test_score:.3f}, RMSE: {test_rmse:.2f}%")
        
        # Feature importance
        importances = self.model.feature_importances_
        features = ['lag1', 'lag2', 'rel_score']
        print(f"   📊 Feature importance:")
        for feat, imp in zip(features, importances):
            print(f"      {feat}: {imp:.3f}")


    def train_on_mock_data(self):
        """
        Fallback training on synthetic data
        Used when insufficient real data is available
        """
        print("🎓 Training on mock data (fallback mode)...")
        
        # Generate 4 years of monthly data
        dates = pd.date_range("2020-01-01", "2023-12-01", freq="YS")
        
        # Simulate US-China tariff rates (realistic trend)
        # Base rate around 15%, increasing trend, some noise
        base_rate = 15.0
        trend = np.linspace(0, 3, len(dates))  # Increasing trend
        noise = np.random.normal(0, 0.5, len(dates))  # Random noise
        
        tariffs = base_rate + trend + noise
        
        df = pd.DataFrame({
            "date": dates,
            "tariff_rate": tariffs,
            "rel_score": -0.7  # Mock US-CN poor relationship
        })

        # Create lagged features
        df["lag1"] = df["tariff_rate"].shift(1)
        df["lag2"] = df["tariff_rate"].shift(2)
        df = df.dropna()

        X = df[["lag1", "lag2", "rel_score"]]
        y = df["tariff_rate"]

        # 80/20 split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )

        # Train model
        self.model = xgb.XGBRegressor(
            n_estimators=self.n_estimators,
            learning_rate=self.learning_rate,
            max_depth=self.max_depth,
            random_state=42
        )
        self.model.fit(X_train, y_train)
        
        # Evaluate
        train_score = self.model.score(X_train, y_train)
        test_score = self.model.score(X_test, y_test)
        
        print(f"   ✅ Mock model trained")
        print(f"   📈 Train R²: {train_score:.3f}, Test R²: {test_score:.3f}")
    


    # # OLD VERSION
    # def train(self):
    #     #train on mock data for now
    #     dates = pd.date_range("2020-01-01", "2023-12-01", freq="MS")
    #     base_rate = 15
    #     noise = np.random.normal(0, 0.5, len(dates))
    #     tariffs = base_rate + np.linspace(0, 3, len(dates)) + noise

    #     relative_score = self.get_relative_score("US", "CN")

        
    #     df = pd.DataFrame({
    #         "date": dates,
    #         "tariff_rate": tariffs,
    #         "rel_score": relative_score
    #     })

    #     # lagged columns foor the model to refer to past months (up to 2 months) tariffs
    #     df["lag1"] = df["tariff_rate"].shift(1) # previous month's tariff
    #     df["lag2"] = df["tariff_rate"].shift(2) # tariff 2 months ago
    #     df = df.dropna()

    #     # Example of lagged features:
    #     # Month   Tariff   lag1    lag2   Target (y)
    #     # -----   ------   ----    ----   -----------
    #     # Jan     15.2     NaN     NaN    (can't train yet)
    #     # Feb     15.5     15.2    NaN    (skip row)
    #     # Mar     15.8     15.5    15.2   → predict 15.8
    #     # Apr     16.0     15.8    15.5   → predict 16.0
    #     # May     16.3     16.0    15.8   → predict 16.3

        
    #     X = df[["lag1", "lag2", "rel_score"]]
    #     y = df["tariff_rate"]

    #     X_train, X_test, y_train, y_test = train_test_split(
    #         X, y, shuffle=False, test_size=12
    #     )

    #     self.model = xgb.XGBRegressor(n_estimators=200, learning_rate=0.1, max_depth=3)
    #     self.model.fit(X_train, y_train)


# ========== PREDICTION METHODS ==========
    def forecast(
        self, import_country: str, export_country: str, last_rates: list[float], horizon: int = 1
    ) -> float:
        """
        Forecast future tariff rate
        
        Args:
            import_country: Importer country code (e.g., 'US')
            export_country: Exporter country code (e.g., 'CN')
            last_rates: List of recent tariff rates (need at least 2 years)
            horizon: Number of years ahead (currently only supports 1)
        
        Returns:
            Predicted tariff rate (percentage)
        """
        if len(last_rates) < 2:
            raise ValueError("Need at least 2 historical rates for prediction")
        
        if self.model is None:
            raise RuntimeError("Model not trained. Call train() first.")
        
        # Get relationship score (with lazy loading)
        rel_score = self.get_relative_score(import_country, export_country)
        
        # Prepare features for prediction
        X_future = pd.DataFrame([{
            "lag1": last_rates[-1],  # Most recent year
            "lag2": last_rates[-2],  # 2 year ago
            "rel_score": rel_score
        }])
        
        # Make prediction
        prediction = float(self.model.predict(X_future)[0])
        
        # Ensure reasonable bounds (tariffs typically 0-50%)
        prediction = np.clip(prediction, 0.0, 50.0)
        
        print(f"   📊 Prediction for {import_country}-{export_country}:")
        print(f"      Last 2 rates: {last_rates[-2]:.2f}%, {last_rates[-1]:.2f}%")
        print(f"      Rel score: {rel_score:.2f}")
        print(f"      Predicted: {prediction:.2f}%")
        
        return prediction


    # def forecast(self, import_country, export_country, last_rates, horizon=1):
    #     """Forecast next tariff given last 2 rates and graph relationship"""
    #     rel = self.get_relative_score(import_country, export_country)
    #     X_future = pd.DataFrame([{
    #         "lag1": last_rates[-1],
    #         "lag2": last_rates[-2],
    #         "rel_score": rel
    #     }])
    #     return float(self.model.predict(X_future)[0])
    

    def forecast_by_product_name(
        self, product_name: str, import_country: str, export_country: str, horizon: int = 1
    ) -> Optional[dict]:
        """
        Forecast tariff by product name (resolves HS code automatically)
        
        Args:
            product_name: Product description (e.g., "smartphones")
            import_country: Importer country code
            export_country: Exporter country code
            horizon: Years ahead to predict
        
        Returns:
            Dict with prediction details or None if failed
        """
        # Resolve product name to HS code
        hs_code = self.resolve_hs_code(product_name)
        
        if not hs_code:
            return None
        
        # Get recent tariff rates
        last_rates = self.get_recent_tariff_rates(hs_code, import_country, export_country, years=4)
        
        if len(last_rates) < 2:
            print(f"⚠️ Insufficient historical data for {product_name} (HS: {hs_code})")
            return None
        
        # Make prediction
        prediction = self.forecast(import_country, export_country, last_rates, horizon)
        
        return {
            "product_name": product_name,
            "hs_code": hs_code,
            "import_country": import_country,
            "export_country": export_country,
            "predicted_tariff": round(prediction, 2),
            "historical_rates": last_rates[-3:],  # Last 3 years
            "horizon_years": horizon
        }
    
    
# ========== UTILITY METHODS ==========
    def get_graph_stats(self) -> dict:
        """Get statistics about the relationship graph"""
        if self.graph.number_of_nodes() == 0:
            return {
                "total_edges": 0,
                "total_nodes": 0,
                "us_connections": 0,
                "avg_degree": 0,
                "status": "empty"
            }
        
        degrees = dict(self.graph.degree())
        
        return {
            "total_edges": self.graph.number_of_edges(),
            "total_nodes": self.graph.number_of_nodes(),
            "us_connections": len(list(self.graph.neighbors('US'))) if self.graph.has_node('US') else 0,
            "avg_degree": sum(degrees.values()) / len(degrees) if degrees else 0,
            "max_degree": max(degrees.values()) if degrees else 0,
            "min_degree": min(degrees.values()) if degrees else 0,
            "status": "initialized"
        }



    def get_model_info(self) -> dict:
        """Get information about the trained model"""
        if self.model is None:
            return {
                "status": "not_trained",
                "message": "Model has not been trained yet"
            }
        
        return {
            "status": "trained",
            "n_estimators": self.n_estimators,
            "learning_rate": self.learning_rate,
            "max_depth": self.max_depth,
            "features": ["lag1", "lag2", "rel_score"],
            "feature_importances": {
                "lag1": float(self.model.feature_importances_[0]),
                "lag2": float(self.model.feature_importances_[1]),
                "rel_score": float(self.model.feature_importances_[2])
            } if hasattr(self.model, 'feature_importances_') else None
        }