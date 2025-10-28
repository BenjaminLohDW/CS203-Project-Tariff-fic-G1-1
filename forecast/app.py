from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from urllib.parse import quote_plus
from flask_cors import CORS
from datetime import datetime
from uuid import uuid4
from dotenv import load_dotenv
from sqlalchemy.exc import IntegrityError
from model import TariffForecaster
import pandas as pd
import os

app = Flask(__name__)
CORS(app)
load_dotenv()

COUNTRY_MS_URL = os.getenv('COUNTRY_MS_BASE', 'http://country:5005')

#initialise and train the forecaster
forecaster = TariffForecaster()
forecaster.init_graph() 
forecaster.train()


#---- health check endpoint ----
@app.get("/health")
def health():
    return {"status": "healthy"}


#----- API ENDPOINTS -----
@app.route("/forecast/predict", methods=["POST"])
def forecast_tariff():
    """
    Predict future tariff rate
    
    Request body option 1 (with HS code):
    {
        "hs_code": "85171300",
        "import_country": "US",
        "export_country": "CN",
        "horizon": 1
    }
    
    Request body option 2 (with explicit rates):
    {
        "import_country": "US",
        "export_country": "CN",
        "last_rates": [15.2, 15.5, 15.8],
        "horizon": 1
    }
    
    Request body option 3 (with product name - uses Product service):
    {
        "product_name": "smartphones",
        "import_country": "US",
        "export_country": "CN",
        "horizon": 1
    }
    """
    try:
        data = request.get_json()
        required = ['import_country', 'export_country', 'horizon']
        if not all(x in data for x in required):
            return jsonify({
                "code": 400, 
                "error": "missing required fields"
            }), 400
        
        import_country = data['import_country'].strip().upper()
        export_country = data['export_country'].strip().upper()
        horizon = int(data.get("horizon", 1))
        
        #option 1: product name provided
        if 'product_name'in data:
            product_name = data['product_name'].strip()
            result = forecaster.forecast_by_product_name(product_name, import_country, export_country, horizon)

            if not result:
                return jsonify({
                    "code": 404,
                    "error": f"Could not resolve product '{product_name}' or insufficient historical data"
                }), 404
            
            return jsonify({
                "code": 200,
                **result
            }), 200
        
        # Option 2: HS code provided (fetch historical rates from Tariff service)
        elif 'hs_code' in data:
            hs_code = data['hs_code'].strip()
            last_rates = forecaster.get_recent_tariff_rates(
                hs_code, import_country, export_country, months=12
            )
            
            if len(last_rates) < 2:
                return jsonify({
                    "code": 400,
                    "error": f"Insufficient historical data for HS code {hs_code}. Found {len(last_rates)} months, need at least 2."
                }), 400
            
            prediction = forecaster.forecast(import_country, export_country, last_rates, horizon)
            
            return jsonify({
                "code": 200,
                "hs_code": hs_code,
                "import_country": import_country,
                "export_country": export_country,
                "predicted_tariff": round(prediction, 2),
                "horizon_months": horizon,
                "historical_context": {
                    "last_6_months": last_rates[-6:] if len(last_rates) >= 6 else last_rates,
                    "data_points_used": len(last_rates)
                }
            }), 200
        
        # Option 3: Explicit last_rates provided
        elif 'last_rates' in data:
            last_rates = data['last_rates']
            
            if not isinstance(last_rates, list) or len(last_rates) < 2:
                return jsonify({
                    "code": 400,
                    "error": "Need minimum 2 tariff rates in last_rates array"
                }), 400
            
            prediction = forecaster.forecast(import_country, export_country, last_rates, horizon)
            
            return jsonify({
                "code": 200,
                "import_country": import_country,
                "export_country": export_country,
                "predicted_tariff": round(prediction, 2),
                "horizon_months": horizon,
                "historical_context": {
                    "last_rates": last_rates,
                    "data_points_used": len(last_rates)
                }
            }), 200
        
        else:
            return jsonify({
                "code": 400,
                "error": "Must provide one of: product_name, hs_code, or last_rates"
            }), 400

    except ValueError as e:
        return jsonify({
            "code": 400,
            "error": str(e)
        }), 400
    except RuntimeError as e:
        return jsonify({
            "code": 500,
            "error": str(e)
        }), 500
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "code": 500,
            "error": f"Internal server error: {str(e)}"
        }), 500

    
@app.route("/forecast/simulate", methods =["POST"])
def simulate_country_rel():
    """
    Simulate prediction with custom relationship score
    
    Request body:
    {
        "import_country": "US",
        "export_country": "CN",
        "rel_score": -0.5,
        "last_rates": [15.2, 15.5],
        "horizon": 1
    }
    """
    try: 
        data = request.get_json()
        required = ['import_country', 'export_country', 'rel_score', 'last_rates']
        
        if not all(x in data for x in required):
            return jsonify({
                "code": 400,
                "error": f"Missing required fields: {', '.join(required)}"
            }), 400
        
        import_country = data['import_country'].strip().upper()
        export_country = data['export_country'].strip().upper()
        rel_score = float(data['rel_score'])
        last_rates = data['last_rates']
        horizon = int(data.get("horizon", 1))
    
        # Validate inputs
        if not isinstance(last_rates, list) or len(last_rates) < 2:
            return jsonify({
                "code": 400,
                "error": "last_rates must include at least 2 values"
            }), 400
        
        if not -1.0 <= rel_score <= 1.0:
            return jsonify({
                "code": 400,
                "error": "rel_score must be between -1.0 and 1.0"
            }), 400
        
        # Build feature row with overridden rel_score
        import pandas as pd
        X_future = pd.DataFrame([{
            "lag1": last_rates[-1],
            "lag2": last_rates[-2],
            "rel_score": rel_score
        }])

        if forecaster.model is None:
            return jsonify({
                "code": 500,
                "error": "Model not trained"
            }), 500

        prediction = float(forecaster.model.predict(X_future)[0])
        prediction = max(0.0, min(50.0, prediction))  # Clip to reasonable range

        return jsonify({
            "code": 200,
            "import_country": import_country,
            "export_country": export_country,
            "scenario_rel_score": rel_score,
            "horizon": horizon,
            "predicted_tariff": round(prediction, 2),
            "historical_rates": last_rates,
            "explanation": f"Scenario: {import_country}-{export_country} relationship score = {rel_score:.2f}"
        }), 200

    except ValueError as e:
        return jsonify({
            "code": 400,
            "error": str(e)
        }), 400
    except Exception as e:
        print(f"❌ Simulation error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "code": 500,
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=True)