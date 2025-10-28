import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert'
import forecastService from '@/lib/forecastService'
import type { ForecastPredictResponse, ForecastSimulateResponse } from '@/lib/forecastService'

export default function ForecastTest() {
  // Predict endpoint state
  const [predictForm, setPredictForm] = useState({
    importCountry: 'US',
    exportCountry: 'CN',
    lastRates: '15.2, 15.5, 15.8',
    horizon: '1'
  })
  const [predictResult, setPredictResult] = useState<ForecastPredictResponse | null>(null)
  const [predictLoading, setPredictLoading] = useState(false)
  const [predictError, setPredictError] = useState<string | null>(null)

  // Simulate endpoint state
  const [simulateForm, setSimulateForm] = useState({
    importCountry: 'US',
    exportCountry: 'CN',
    hsCode: '0101',
    relScore: '-0.7',
    lastRates: '15.2, 15.5',
    horizon: '1'
  })
  const [simulateResult, setSimulateResult] = useState<ForecastSimulateResponse | null>(null)
  const [simulateLoading, setSimulateLoading] = useState(false)
  const [simulateError, setSimulateError] = useState<string | null>(null)

  // Health check state
  const [healthStatus, setHealthStatus] = useState<boolean | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Handler for Predict Tariff
  const handlePredict = async () => {
    setPredictLoading(true)
    setPredictError(null)
    setPredictResult(null)

    try {
      const ratesArray = predictForm.lastRates.split(',').map(r => parseFloat(r.trim()))
      const result = await forecastService.predictTariff(
        predictForm.importCountry,
        predictForm.exportCountry,
        ratesArray,
        parseInt(predictForm.horizon)
      )
      setPredictResult(result)
    } catch (error: any) {
      setPredictError(error.message)
    } finally {
      setPredictLoading(false)
    }
  }

  // Handler for Simulate Country Relation
  const handleSimulate = async () => {
    setSimulateLoading(true)
    setSimulateError(null)
    setSimulateResult(null)

    try {
      const ratesArray = simulateForm.lastRates.split(',').map(r => parseFloat(r.trim()))
      const result = await forecastService.simulateCountryRelation(
        simulateForm.importCountry,
        simulateForm.exportCountry,
        simulateForm.hsCode,
        parseFloat(simulateForm.relScore),
        ratesArray,
        parseInt(simulateForm.horizon)
      )
      setSimulateResult(result)
    } catch (error: any) {
      setSimulateError(error.message)
    } finally {
      setSimulateLoading(false)
    }
  }

  // Handler for Health Check
  const handleHealthCheck = async () => {
    setHealthLoading(true)
    try {
      const isHealthy = await forecastService.checkHealth()
      setHealthStatus(isHealthy)
    } catch (error) {
      setHealthStatus(false)
    } finally {
      setHealthLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Forecast Service Test</h1>
        <p className="text-muted-foreground">
          Test the forecast microservice endpoints to predict tariff rates
        </p>
      </div>

      {/* Health Check Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Health Check</CardTitle>
          <CardDescription>Check if the forecast service is running</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button onClick={handleHealthCheck} disabled={healthLoading}>
              {healthLoading ? 'Checking...' : 'Check Health'}
            </Button>
            {healthStatus !== null && (
              <Alert className={healthStatus ? 'border-green-500' : 'border-red-500'}>
                <AlertTitle>{healthStatus ? '✅ Healthy' : '❌ Unhealthy'}</AlertTitle>
                <AlertDescription>
                  Service is {healthStatus ? 'running normally' : 'not responding'}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predict Tariff Section */}
        <Card>
          <CardHeader>
            <CardTitle>1. Predict Tariff</CardTitle>
            <CardDescription>
              POST /forecast/predict - Predict future tariff based on historical rates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="predict-import">Import Country Code</Label>
              <Input
                id="predict-import"
                value={predictForm.importCountry}
                onChange={(e) => setPredictForm({ ...predictForm, importCountry: e.target.value })}
                placeholder="US"
              />
            </div>
            <div>
              <Label htmlFor="predict-export">Export Country Code</Label>
              <Input
                id="predict-export"
                value={predictForm.exportCountry}
                onChange={(e) => setPredictForm({ ...predictForm, exportCountry: e.target.value })}
                placeholder="CN"
              />
            </div>
            <div>
              <Label htmlFor="predict-rates">Last Rates (comma-separated, min 2)</Label>
              <Input
                id="predict-rates"
                value={predictForm.lastRates}
                onChange={(e) => setPredictForm({ ...predictForm, lastRates: e.target.value })}
                placeholder="15.2, 15.5, 15.8"
              />
            </div>
            <div>
              <Label htmlFor="predict-horizon">Horizon (periods ahead)</Label>
              <Input
                id="predict-horizon"
                type="number"
                value={predictForm.horizon}
                onChange={(e) => setPredictForm({ ...predictForm, horizon: e.target.value })}
                placeholder="1"
              />
            </div>
            <Button onClick={handlePredict} disabled={predictLoading} className="w-full">
              {predictLoading ? 'Predicting...' : 'Predict Tariff'}
            </Button>

            {predictError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{predictError}</AlertDescription>
              </Alert>
            )}

            {predictResult && (
              <Alert className="border-green-500">
                <AlertTitle>✅ Prediction Result</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    <p><strong>Import Country:</strong> {predictResult.import_country}</p>
                    <p><strong>Export Country:</strong> {predictResult.export_country}</p>
                    <p><strong>Last Rates:</strong> {predictResult.last_rates.join(', ')}</p>
                    <p className="text-lg font-bold text-green-600">
                      <strong>Predicted Tariff:</strong> {predictResult.predicted_tariff}%
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Simulate Country Relation Section */}
        <Card>
          <CardHeader>
            <CardTitle>2. Simulate Country Relation</CardTitle>
            <CardDescription>
              POST /forecast/simulate - Simulate with custom relationship score
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="simulate-import">Import Country</Label>
              <Input
                id="simulate-import"
                value={simulateForm.importCountry}
                onChange={(e) => setSimulateForm({ ...simulateForm, importCountry: e.target.value })}
                placeholder="US"
              />
            </div>
            <div>
              <Label htmlFor="simulate-export">Export Country</Label>
              <Input
                id="simulate-export"
                value={simulateForm.exportCountry}
                onChange={(e) => setSimulateForm({ ...simulateForm, exportCountry: e.target.value })}
                placeholder="CN"
              />
            </div>
            <div>
              <Label htmlFor="simulate-hs">HS Code</Label>
              <Input
                id="simulate-hs"
                value={simulateForm.hsCode}
                onChange={(e) => setSimulateForm({ ...simulateForm, hsCode: e.target.value })}
                placeholder="0101"
              />
            </div>
            <div>
              <Label htmlFor="simulate-rel">Relationship Score (-1 to 1)</Label>
              <Input
                id="simulate-rel"
                type="number"
                step="0.1"
                value={simulateForm.relScore}
                onChange={(e) => setSimulateForm({ ...simulateForm, relScore: e.target.value })}
                placeholder="-0.7"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Negative = high tariffs, Positive = low tariffs
              </p>
            </div>
            <div>
              <Label htmlFor="simulate-rates">Last Rates (comma-separated, min 2)</Label>
              <Input
                id="simulate-rates"
                value={simulateForm.lastRates}
                onChange={(e) => setSimulateForm({ ...simulateForm, lastRates: e.target.value })}
                placeholder="15.2, 15.5"
              />
            </div>
            <div>
              <Label htmlFor="simulate-horizon">Horizon</Label>
              <Input
                id="simulate-horizon"
                type="number"
                value={simulateForm.horizon}
                onChange={(e) => setSimulateForm({ ...simulateForm, horizon: e.target.value })}
                placeholder="1"
              />
            </div>
            <Button onClick={handleSimulate} disabled={simulateLoading} className="w-full">
              {simulateLoading ? 'Simulating...' : 'Simulate Scenario'}
            </Button>

            {simulateError && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{simulateError}</AlertDescription>
              </Alert>
            )}

            {simulateResult && (
              <Alert className="border-blue-500">
                <AlertTitle>✅ Simulation Result</AlertTitle>
                <AlertDescription>
                  <div className="space-y-2 mt-2">
                    <p><strong>Countries:</strong> {simulateResult.import_country} ← {simulateResult.export_country}</p>
                    <p><strong>HS Code:</strong> {simulateResult.hs_code}</p>
                    <p><strong>Relationship Score:</strong> {simulateResult.scenario_rel_score}</p>
                    <p className="text-lg font-bold text-blue-600">
                      <strong>Predicted Tariff:</strong> {simulateResult.predicted_tariff}%
                    </p>
                    <p className="text-sm italic">{simulateResult.explanation}</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Base URL</h3>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {import.meta.env.VITE_FORECAST_API_URL || 'http://localhost:5007'}
              </code>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Key Features</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>ML-based prediction using XGBoost regression</li>
                <li>Uses historical tariff rates (lag features)</li>
                <li>Incorporates country relationship scores from network graph</li>
                <li>Minimum 2 historical rates required for prediction</li>
                <li>What-if scenario simulation with custom relationship scores</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Relationship Score Guide</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>-1.0 to -0.5:</strong> Very poor relations (high tariffs expected)</li>
                <li><strong>-0.5 to 0:</strong> Poor to neutral relations</li>
                <li><strong>0 to 0.5:</strong> Neutral to good relations</li>
                <li><strong>0.5 to 1.0:</strong> Very good relations (low tariffs expected)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
