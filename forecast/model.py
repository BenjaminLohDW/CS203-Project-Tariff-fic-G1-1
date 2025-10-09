import pandas as pd
import numpy as np
import networkx as nx
import xgboost as xgb
from sklearn.model_selection import train_test_split

class TariffForecaster:
    def __init__(self):
        self.model = None
        self.graph = nx.Graph()

    def init_graph(self):
        #sample weights between countries
        self.graph.add_edge("US", "CN", weight = -0.7) # negative weight indicates high tariff
        self.graph.add_edge("US", "SG", weight = 0.3)
        self.graph.add_edge("SG", "CN", weight = 0.5)


    def get_relative_score(self, import_country, export_country):
        try:
            # graph -> US:{CN:{weight:-0.7}, SG:{weight: 0.3}} ; dict of list of neighbors and their weights
            return self.graph[import_country][export_country]["weight"]
        except KeyError:
            return 0.0  # default neutral score if no direct edge
        

    def train(self):
        #train on mock data for now
        dates = pd.date_range("2020-01-01", "2023-12-01", freq="MS")
        base_rate = 15
        noise = np.random.normal(0, 0.5, len(dates))
        tariffs = base_rate + np.linspace(0, 3, len(dates)) + noise

        relative_score = self.get_relative_score("US", "CN")

        
        df = pd.DataFrame({
            "date": dates,
            "tariff_rate": tariffs,
            "rel_score": relative_score
        })

        # lagged columns foor the model to refer to past months (up to 2 months) tariffs
        df["lag1"] = df["tariff_rate"].shift(1) # previous month's tariff
        df["lag2"] = df["tariff_rate"].shift(2) # tariff 2 months ago
        df = df.dropna()

        # Example of lagged features:
        # Month   Tariff   lag1    lag2   Target (y)
        # -----   ------   ----    ----   -----------
        # Jan     15.2     NaN     NaN    (can't train yet)
        # Feb     15.5     15.2    NaN    (skip row)
        # Mar     15.8     15.5    15.2   → predict 15.8
        # Apr     16.0     15.8    15.5   → predict 16.0
        # May     16.3     16.0    15.8   → predict 16.3

        
        X = df[["lag1", "lag2", "rel_score"]]
        y = df["tariff_rate"]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, shuffle=False, test_size=12
        )

        self.model = xgb.XGBRegressor(n_estimators=200, learning_rate=0.1, max_depth=3)
        self.model.fit(X_train, y_train)


    def forecast(self, import_country, export_country, last_rates, horizon=1):
        """Forecast next tariff given last 2 rates and graph relationship"""
        rel = self.get_relative_score(import_country, export_country)
        X_future = pd.DataFrame([{
            "lag1": last_rates[-1],
            "lag2": last_rates[-2],
            "rel_score": rel
        }])
        return float(self.model.predict(X_future)[0])
    
    
