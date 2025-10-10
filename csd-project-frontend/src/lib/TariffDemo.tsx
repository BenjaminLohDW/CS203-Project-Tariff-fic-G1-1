import { useState } from 'react'
import tariffService from './tariffService.js'

const TariffDemo = () => {
  const [hsCode, setHsCode] = useState('')
  const [tariffs, setTariffs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async () => {
    if (!hsCode.trim()) {
      setError('Please enter an HS Code')
      return
    }

    setLoading(true)
    setError('')
    setTariffs([])

    try {
      const results = await tariffService.getTariffsByHsCode(hsCode.trim())
      setTariffs(results)
      
      if (results.length === 0) {
        setError('No tariffs found for this HS Code')
      }
    } catch (err) {
      setError(`Error: ${(err as any).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setHsCode('')
    setTariffs([])
    setError('')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Tariff Service Demo</h2>
      
      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h3 className="text-lg font-semibold mb-4">Search Tariffs by HS Code</h3>
        
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={hsCode}
            onChange={(e) => setHsCode(e.target.value)}
            placeholder="Enter HS Code (e.g., 010121)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        </div>
        
        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {tariffs.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">
            Found {tariffs.length} tariff{tariffs.length !== 1 ? 's' : ''} for HS Code: {hsCode}
          </h3>
          
          <div className="space-y-4">
            {tariffs.map((tariff, index) => {
              const formatted = tariffService.formatTariffForDisplay(tariff)
              
              return (
                <div key={tariff.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Tariff Details</h4>
                      <p><strong>ID:</strong> {formatted.id}</p>
                      <p><strong>HS Code:</strong> {formatted.hsCode}</p>
                      <p><strong>Type:</strong> {formatted.type}</p>
                      <p><strong>Rate:</strong> {formatted.rate}</p>
                      {formatted.specificAmount && (
                        <p><strong>Specific Amount:</strong> ${formatted.specificAmount} per {formatted.specificUnit}</p>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Countries & Validity</h4>
                      <p><strong>Importer:</strong> {formatted.importer}</p>
                      <p><strong>Exporter:</strong> {formatted.exporter}</p>
                      <p><strong>Valid From:</strong> {formatted.validFrom || 'N/A'}</p>
                      <p><strong>Valid To:</strong> {formatted.validTo || 'N/A'}</p>
                      <p>
                        <strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          formatted.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {formatted.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </p>
                    </div>
                  </div>
                  
                  {/* Sample Calculation */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h5 className="font-semibold text-gray-700 mb-2">Sample Calculation (for $1000 goods)</h5>
                    {(() => {
                      const calculation = tariffService.calculateTariffAmount(tariff, 1000)
                      return (
                        <div className="bg-gray-50 p-3 rounded">
                          <p><strong>Tariff Amount:</strong> ${calculation.tariffAmount}</p>
                          <p><strong>Effective Rate:</strong> {calculation.effectiveRate.toFixed(2)}%</p>
                          <p><strong>Calculation:</strong> {calculation.calculation}</p>
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* Raw Data Toggle */}
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Raw API Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-x-auto">
                      {JSON.stringify(tariff, null, 2)}
                    </pre>
                  </details>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default TariffDemo