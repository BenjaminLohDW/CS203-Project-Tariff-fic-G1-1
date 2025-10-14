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

#initialise and train the forecaster
forecaster = TariffForecaster()
forecaster.init_graph() 
forecaster.train()


#---- health check endpoint ----
@app.get("/health")
def health():
    return {"status": "healthy"}


#----- API ENDPOINTS -----
@app.route("/api/forecast", methods=["POST"])
def forecast_tariff():
    try:
        data = request.get_json()
        required = ['import_country', 'export_country', 'last_rates', 'horizon']
        if not all(x in data for x in required):
            return jsonify({
                "code": 400, 
                "error": "missing required fields"
            }), 400
        
        import_country = data['import_country'].strip().upper()
        export_country = data['export_country'].strip().upper()
        last_rates = data['last_rates']
        horizon = int(data.get("horizon", 1))

        #check if last rates is a list/ minimally have 2 items so that we can create a lagged table with min ast 2 months of data
        if not isinstance(last_rates, list) or len(last_rates) < 2:
            return jsonify({
                "code": 400,
                "error": "need min 2 tarrif rates to train model"
            }), 400


        prediction = forecaster.forecast(import_country, export_country, last_rates, horizon)

        return jsonify({
            "code": 200,
            "import_country": import_country,
            "export_country": export_country,
            "last_rates": last_rates,
            "predicted_tariff": round(prediction, 2)    
        }), 200

    except Exception as e:
        return jsonify({
            "code": 500,
            "message": str(e)
        }), 500
    
@app.route("/api/simulate", methods =["POST"])
def simulate_country_rel():
    try: 
        data = request.get_json()
        required = ['import_country', 'export_country', 'hs_coode', 'rel_score', 'last_rates', 'horizon']

        if not all(x in data for x in required):
            return jsonify ({
                "code" : 400,
                "error": "missing required fields"
            }), 400
        
        import_country = data['import_country']
        export_country = data['export_country']
        hs_code = data['hs_code']
        rel_score = data['rel_score']
        last_rates = data['last_rates']
        horizon = int(data.get("horizon", 1))
    
        #ensure there is enough data (at least precceding 2 months) to predict future values
        if not (last_rates and len(last_rates) >= 2):
            return jsonify({
                "error": "last_rates must include at least 2 values"
            }), 400
        
        # Build feature row with overridden rel_score
        X_future = pd.DataFrame([{
            "lag1": last_rates[-1],
            "lag2": last_rates[-2],
            "rel_score": rel_score
        }])

        prediction = float(forecaster.model.predict(X_future)[0])

        return jsonify({
            "code": 200,
            "import_country": import_country,
            "export_country": export_country,
            "hs_code": hs_code,
            "scenario_rel_score": rel_score,
            "horizon": horizon,
            "predicted_tariff": round(prediction, 2),
            "explanation": f"Prediction assumes {import_country}-{export_country} relationship score = {rel_score}"
        }), 200

    except Exception as e:
        return jsonify ({
            "code" : 500,
            "error": str(e)
        }), 500



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=True)