# Forecast Microservice

A machine learning-based tariff forecasting service using XGBoost regression with network graph features.

## Overview

The Forecast microservice predicts future tariff rates based on:

- **Historical tariff rates** (lagged features from previous months)
- **Country relationship scores** (derived from a network graph of trade relationships)

## Technology Stack

- **Framework**: Flask
- **ML Model**: XGBoost Regressor
- **Graph Library**: NetworkX
- **Data Processing**: Pandas, NumPy
- **Machine Learning**: scikit-learn

## Features

### 1. Tariff Prediction (`/forecast/predict`)

Predicts future tariff rates based on historical data and country relationships.

**Request:**

```json
{
  "import_country": "US",
  "export_country": "CN",
  "last_rates": [15.2, 15.5],
  "horizon": 1
}
```

**Response:**

```json
{
  "code": 200,
  "import_country": "US",
  "export_country": "CN",
  "last_rates": [15.2, 15.5],
  "predicted_tariff": 15.78
}
```

### 2. Country Relationship Simulation (`/forecast/simulate`)

Simulates tariff predictions with custom relationship scores to model "what-if" scenarios.

**Request:**

```json
{
  "import_country": "US",
  "export_country": "CN",
  "hs_code": "0101",
  "rel_score": -0.5,
  "last_rates": [15.2, 15.5],
  "horizon": 1
}
```

**Response:**

```json
{
  "code": 200,
  "import_country": "US",
  "export_country": "CN",
  "hs_code": "0101",
  "scenario_rel_score": -0.5,
  "horizon": 1,
  "predicted_tariff": 16.2,
  "explanation": "Prediction assumes US-CN relationship score = -0.5"
}
```

### 3. Health Check (`/health`)

Simple health check endpoint.

**Response:**

```json
{
  "status": "healthy"
}
```

## Model Architecture

The forecasting model uses:

- **Lag Features**: Previous 2 months of tariff rates (lag1, lag2)
- **Relationship Score**: Graph-based edge weight between import/export countries
- **Algorithm**: XGBoost Regressor with 200 estimators, learning rate 0.1, max depth 3

### Training Data

Currently trained on mock data simulating tariff progression from 2020-2023:

- Base rate: 15%
- Linear trend component
- Random noise component
- Country relationship factor

## API Endpoints

| Endpoint             | Method | Description                             |
| -------------------- | ------ | --------------------------------------- |
| `/health`            | GET    | Health check                            |
| `/forecast/predict`  | POST   | Predict future tariff                   |
| `/forecast/simulate` | POST   | Simulate with custom relationship score |

## Running the Service

### Standalone

```bash
python app.py
```

Service runs on `http://localhost:5007`

### With Docker Compose

```bash
docker-compose up forecast
```

## Frontend Integration

The forecast service is integrated with the frontend via `forecastService.ts`:

```typescript
import forecastService from "./lib/forecastService";

// Predict tariff
const prediction = await forecastService.predictTariff(
  "US",
  "CN",
  [15.2, 15.5, 15.8],
  1
);

// Simulate scenario
const simulation = await forecastService.simulateCountryRelation(
  "US",
  "CN",
  "0101",
  -0.7,
  [15.2, 15.5],
  1
);
```

## Requirements

Minimum 2 historical tariff rates required for prediction (lag1 and lag2 features).

## Future Improvements

- [ ] Replace mock training data with real historical tariff data
- [ ] Expand country relationship graph
- [ ] Add confidence intervals to predictions
- [ ] Implement multi-horizon forecasting
- [ ] Add feature importance analysis
- [ ] Integrate with tariff microservice for automatic historical data fetching
