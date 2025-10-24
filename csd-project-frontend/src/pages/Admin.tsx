import { useState } from 'react'
import App from '../App'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'

function Admin() {
  // State for page navigation
  const [showManagement, setShowManagement] = useState<boolean>(false)
  // State for management tab selection
  const [managementTab, setManagementTab] = useState<'tariffs' | 'agreements' | 'countries'>('tariffs')

  // Render Management page (placeholder for Phase 3 & 4)
  const renderManagement = () => (
    <div className="text-center py-8 px-4 max-w-[1800px] mx-auto">
      <h1 className="text-gray-800 mb-8 text-4xl font-bold">Admin Management</h1>
      
      {/* Tab Navigation */}
      <div className="flex justify-center gap-2 mb-6">
        <button
          onClick={() => setManagementTab('tariffs')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            managementTab === 'tariffs'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          📋 Tariffs
        </button>
        <button
          onClick={() => setManagementTab('agreements')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            managementTab === 'agreements'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🤝 Agreements
        </button>
        <button
          onClick={() => setManagementTab('countries')}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            managementTab === 'countries'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          🌍 Countries
        </button>
      </div>

      {/* Tab Content */}
      <Card className="mb-6 bg-purple-50 border-purple-300">
        <CardHeader>
          <CardTitle className="text-lg text-purple-800">
            {managementTab === 'tariffs' && 'Manage Tariffs'}
            {managementTab === 'agreements' && 'Manage Agreements'}
            {managementTab === 'countries' && 'Manage Countries'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {managementTab === 'tariffs' && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-md">📋 Tariff Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Update tariff rules and insert new tariffs via CSV or manual entry
                </p>
                <p className="text-xs text-gray-500 italic">
                  Feature coming in Phase 3 & 4
                </p>
              </CardContent>
            </Card>
          )}

          {managementTab === 'agreements' && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-md">🤝 Agreement Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Create and update trade agreements between countries
                </p>
                <p className="text-xs text-gray-500 italic">
                  Feature coming in Phase 3 & 4
                </p>
              </CardContent>
            </Card>
          )}

          {managementTab === 'countries' && (
            <Card className="bg-white">
              <CardHeader>
                <CardTitle className="text-md">🌍 Country Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Add, update, or remove countries and their relationships
                </p>
                <p className="text-xs text-gray-500 italic">
                  Feature coming in Phase 3 & 4
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )

  return (
    <App 
      onManagementClick={() => setShowManagement(true)}
      onCalculationClick={() => setShowManagement(false)}
      onHistoryClick={() => setShowManagement(false)}
      managementContent={renderManagement()}
      showManagement={showManagement}
    />
  )
}

export default Admin
