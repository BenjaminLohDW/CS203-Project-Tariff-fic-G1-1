import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext.jsx'
import { fetchCountries } from './lib/countryService.js'
import { saveCalculation, getUserHistory, getHistoryTariffLines } from './lib/historyService.js'
import ProductAutocomplete from './lib/ProductAutocomplete.jsx'
import tariffService from './lib/tariffService.js'
import './App.css'

function App() {
  const navigate = useNavigate()
  const { userProfile, logOut, setUserProfile } = useAuth()
  // Ref for autoscroll to results section
  const resultsRef = useRef(null)
  
  // State for page navigation
  const [currentPage, setCurrentPage] = useState('calculation')
  
  // State for storing selected values
  const [selectedProduct, setSelectedProduct] = useState(null) // Changed to object for React Select
  const [selectedImportingCountry, setSelectedImportingCountry] = useState('')
  const [selectedExportingCountry, setSelectedExportingCountry] = useState('')
  const [quantity, setQuantity] = useState('')
  const [cost, setCost] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Initialize dates to current date on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
    setStartDate(today)
    setEndDate(today)
  }, [])
  
  // State for manual tariff mode
  const [isManualTariff, setIsManualTariff] = useState(false)
  const [tariffRate, setTariffRate] = useState('')
  
  // State for calculated values (only updated when calculate button is clicked)
  const [calculatedProduct, setCalculatedProduct] = useState('')
  const [calculatedImportingCountry, setCalculatedImportingCountry] = useState('')
  const [calculatedExportingCountry, setCalculatedExportingCountry] = useState('')
  const [calculatedQuantity, setCalculatedQuantity] = useState('')
  const [calculatedCost, setCalculatedCost] = useState('')
  const [calculatedStartDate, setCalculatedStartDate] = useState('')
  const [calculatedEndDate, setCalculatedEndDate] = useState('')
  const [calculatedTariffRate, setCalculatedTariffRate] = useState('')
  
  // State for API tariff data
  const [tariffData, setTariffData] = useState([])
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(false)
  
  // State for saved calculation history
  const [calculationHistory, setCalculationHistory] = useState([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState('')
  
  // State for date validation
  const [dateValidationError, setDateValidationError] = useState('')
  
  // State for country validation
  const [countryValidationError, setCountryValidationError] = useState('')
  
  // State to track if fields have been modified after calculation
  const [fieldsModified, setFieldsModified] = useState(false)

  // State for countries from API
  const [countries, setCountries] = useState([])
  const [isLoadingCountries, setIsLoadingCountries] = useState(true)
  
  // State for detailed tariff view modal
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState(null)
  const [loadingTariffDetails, setLoadingTariffDetails] = useState(false)

  // Fetch countries from API on component mount
  useEffect(() => {
    const loadCountries = async () => {
      setIsLoadingCountries(true)
      try {
        const countriesData = await fetchCountries()
        setCountries(countriesData)
      } catch (error) {
        console.error('Failed to load countries:', error)
        // Fallback countries are already handled in the service
      } finally {
        setIsLoadingCountries(false)
      }
    }

    loadCountries()
  }, [])

  // Helper function to get country code from country name
  // TODO: Backend team - Update tariff API to accept country names instead of ISO codes
  // Current workaround: Frontend maps country names to ISO codes before API calls
  const getCountryCode = (countryName) => {
    if (!countryName) return null
    const country = countries.find(c => c.name === countryName)
    return country ? country.code : null
  }

  // Handle dropdown changes
  const handleProductChange = (selectedOption) => {
    setSelectedProduct(selectedOption)
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
  }

  const handleImportingCountryChange = (e) => {
    const newImportingCountry = e.target.value
    setSelectedImportingCountry(newImportingCountry)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Validate countries are different if both are selected
    if (newImportingCountry && selectedExportingCountry && newImportingCountry === selectedExportingCountry) {
      setCountryValidationError('Importing and exporting countries cannot be the same')
    } else {
      setCountryValidationError('')
    }
  }

  const handleExportingCountryChange = (e) => {
    const newExportingCountry = e.target.value
    setSelectedExportingCountry(newExportingCountry)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Validate countries are different if both are selected
    if (selectedImportingCountry && newExportingCountry && selectedImportingCountry === newExportingCountry) {
      setCountryValidationError('Importing and exporting countries cannot be the same')
    } else {
      setCountryValidationError('')
    }
  }

  const handleQuantityChange = (e) => {
    const value = e.target.value
    // Only allow positive whole numbers
    if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 1)) {
      setQuantity(value)
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true)
      }
    }
  }

  const handleCostChange = (e) => {
    const value = e.target.value
    // Allow positive numbers (including decimals)
    if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
      setCost(value)
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true)
      }
    }
  }

  const handleManualTariffChange = (e) => {
    setIsManualTariff(e.target.checked)
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    // Clear validation errors when switching modes
    setCountryValidationError('')
    setDateValidationError('')
  }

  const handleTariffRateChange = (e) => {
    const value = e.target.value
    // Only allow numbers between 0 and 100 (inclusive, with decimals)
    if (value === '' || (!isNaN(value) && Number(value) >= 0 && Number(value) <= 100)) {
      setTariffRate(value)
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true)
      }
    }
  }

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value
    setStartDate(newStartDate)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Validate dates if both are set
    if (newStartDate && endDate && new Date(newStartDate) > new Date(endDate)) {
      setDateValidationError('Start date cannot be after end date')
    } else {
      setDateValidationError('')
    }
  }

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value
    setEndDate(newEndDate)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Validate dates if both are set
    if (startDate && newEndDate && new Date(startDate) > new Date(newEndDate)) {
      setDateValidationError('Start date cannot be after end date')
    } else {
      setDateValidationError('')
    }
  }

  // Tariff calculation functions
  const calculateSpecificTariff = (quantity, tariffAmount) => {
    // Specific tariff: fixed amount per unit (tariffAmount is cost per unit)
    return Number(quantity) * Number(tariffAmount)
  }

  const calculateAdValoremTariff = (baseValue, tariffRate) => {
    // Ad valorem tariff: percentage of the value (tariffRate is percentage)
    return Number(baseValue) * (Number(tariffRate) / 100)
  }

  // Hashmap/Dictionary mapping tariff types to calculation functions
  const tariffCalculationMap = {
    'specific': calculateSpecificTariff,
    'ad valorem': calculateAdValoremTariff,
    'compound': calculateAdValoremTariff, // Can be extended later for compound tariffs
    'quota': calculateAdValoremTariff // Can be extended later for quota tariffs
  }

  // Function to calculate tariff amount based on type
  const calculateTariffAmount = (tariffType, quantity, baseValue, tariffAmount) => {
    const calculationFunction = tariffCalculationMap[tariffType.toLowerCase()]
    
    if (!calculationFunction) {
      console.warn(`Unknown tariff type: ${tariffType}`)
      return 0
    }

    switch (tariffType.toLowerCase()) {
      case 'specific':
        return calculationFunction(quantity, tariffAmount)
      case 'ad valorem':
      default:
        return calculationFunction(baseValue, tariffAmount)
    }
  }

  // Fetch tariff data from Tariff microservice
  const fetchTariffData = async () => {
    setIsLoadingTariffs(true)
    
    try {
      let tariffs = []
      
      // Get HS code from selected product or user input
      let hsCode = null
      
      if (selectedProduct) {
        // If product is selected, extract or derive HS code
        if (selectedProduct.isHsCode) {
          // User entered HS code directly
          hsCode = selectedProduct.value
        } else {
          // For now, we'll skip API call for product names and show a message
          // In the future, you might want to call the product service to get HS codes
          console.log('Selected product:', selectedProduct.label)
          setTariffData([])
          setIsLoadingTariffs(false)
          alert('HS code lookup for product names is not yet implemented. Please use the HS code input mode.')
          return []
        }
      }
      
      if (hsCode) {
        // Call tariff service with HS code
        console.log('Fetching tariffs for HS code:', hsCode)
        
        if (selectedImportingCountry && selectedExportingCountry) {
          // TODO: Backend team - Update tariff API to accept country names instead of ISO codes
          // CURRENT ISSUE: Tariff API expects ISO codes (SG, CN) but frontend sends names (Singapore, China)
          // WORKAROUND: Convert country names to ISO codes before API call
          const importerCode = getCountryCode(selectedImportingCountry)
          const exporterCode = getCountryCode(selectedExportingCountry)
          
          if (!importerCode || !exporterCode) {
            throw new Error(`Could not find country codes for: ${selectedImportingCountry} -> ${selectedExportingCountry}`)
          }
          
          console.log(`Mapping countries: ${selectedImportingCountry} -> ${importerCode}, ${selectedExportingCountry} -> ${exporterCode}`)
          
          // Get specific tariffs for the country combination using ISO codes
          tariffs = await tariffService.getTariffsByCombo(
            hsCode, 
            importerCode,  // Use ISO code instead of full name
            exporterCode   // Use ISO code instead of full name
          )
        } else {
          // Get all tariffs for this HS code
          tariffs = await tariffService.getTariffsByHsCode(hsCode)
        }
        
        console.log('Received tariffs:', tariffs)
        
        // Transform API response to match existing UI format
        const transformedTariffs = tariffs.map(tariff => {
          // TODO: Backend team - Consider returning country names in API response
          // Current: API returns ISO codes (SG, CN) but UI shows full names
          const importerName = countries.find(c => c.code === tariff.importerId)?.name || tariff.importerId
          const exporterName = countries.find(c => c.code === tariff.exporterId)?.name || tariff.exporterId
          
          return {
            "Tariff Type": tariff.tariffType || 'ad_valorem',
            "Tariff Description": `${importerName} → ${exporterName} (HS: ${tariff.hsCode})`,
            "Tariff amount": tariff.specificAmt || tariff.tariffRate || 0,
            "originalData": tariff // Keep original data for reference
          }
        })
        
        setTariffData(transformedTariffs)
      } else {
        // No valid HS code available
        console.warn('No HS code available for tariff lookup')
        setTariffData([])
      }
    } catch (error) {
      console.error('Failed to fetch tariff data:', error)
      alert(`Failed to fetch tariff data: ${error.message}`)
      setTariffData([])
    } finally {
      setIsLoadingTariffs(false)
    }
    
    return tariffData
  }

  // Handle calculate button click
  const handleCalculate = async () => {
    // Clear previous results immediately when calculate is clicked
    setCalculatedProduct('')
    setCalculatedImportingCountry('')
    setCalculatedExportingCountry('')
    setCalculatedQuantity('')
    setCalculatedCost('')
    setCalculatedStartDate('')
    setCalculatedEndDate('')
    setCalculatedTariffRate('')
    setTariffData([])
    
    // Reset fields modified flag since we're recalculating
    setFieldsModified(false)
    
    // Set basic calculated values
    setCalculatedProduct(selectedProduct?.label || '')
    setCalculatedImportingCountry(selectedImportingCountry)
    setCalculatedExportingCountry(selectedExportingCountry)
    setCalculatedQuantity(quantity)
    setCalculatedCost(cost)
    setCalculatedStartDate(startDate)
    setCalculatedEndDate(endDate)
    setCalculatedTariffRate(tariffRate)
    
    // Fetch tariff data from API (simulated)
    if (quantity && cost) {
      await fetchTariffData()
    }
  }

  // Handle save calculation to history
  const handleSaveCalculation = async () => {
    // Check if there are calculated values to save
    if (isManualTariff) {
      if (!calculatedQuantity && !calculatedCost && !calculatedTariffRate) {
        alert('No calculation results to save. Please calculate first.')
        return
      }
    } else {
      if (!calculatedProduct && !calculatedImportingCountry && !calculatedExportingCountry && !calculatedQuantity && !calculatedCost && !calculatedStartDate && !calculatedEndDate) {
        alert('No calculation results to save. Please calculate first.')
        return
      }
    }

    // Create calculation data object
    const baseAmount = calculatedQuantity && calculatedCost ? (Number(calculatedQuantity) * Number(calculatedCost)) : 0
    const totalTariffs = calculatedQuantity && calculatedCost && tariffData.length > 0 ? 
      tariffData.reduce((sum, tariff) => {
        const tariffAmount = calculateTariffAmount(
          tariff["Tariff Type"], 
          calculatedQuantity, 
          baseAmount, 
          tariff["Tariff amount"]
        )
        return sum + tariffAmount
      }, 0) : 0
    const finalAmount = baseAmount + totalTariffs

    const calculationData = {
      user_id: userProfile?.user_id || 'anonymous',
      product_type: calculatedProduct || 'Not specified',
      total_qty: calculatedQuantity || 0,
      base_cost: baseAmount,
      final_cost: finalAmount,
      import_country: calculatedImportingCountry || 'Not specified',
      export_country: calculatedExportingCountry || 'Not specified',
      tariff_lines: tariffData.length > 0 ? tariffData.map(tariff => ({
        description: tariff["Tariff Description"] || tariff["Tariff Type"],
        type: tariff["Tariff Type"],
        rate: tariff["Tariff amount"],
        amount: calculateTariffAmount(
          tariff["Tariff Type"], 
          calculatedQuantity, 
          baseAmount, 
          tariff["Tariff amount"]
        )
      })) : []
    }

    // Debug user authentication
    console.log('User Profile:', userProfile)
    console.log('User ID being saved:', calculationData.user_id)

    try {
      // Save to history microservice
      const response = await saveCalculation(calculationData)
      
      // Log the response for debugging
      console.log('History save response:', response)
      console.log('Response history object:', response?.history)
      console.log('History ID:', response?.history?.history_id)
      
      // Also add to local state for immediate UI update
      const localHistoryEntry = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleString(),
        mode: isManualTariff ? 'Manual Tariff' : 'Standard',
        productType: calculationData.product_type,
        importingCountry: calculationData.import_country,
        exportingCountry: calculationData.export_country,
        quantity: calculationData.total_qty,
        cost: calculatedCost || 0,
        tariffRate: calculatedTariffRate || 0,
        startDate: calculatedStartDate || new Date().toISOString().split('T')[0],
        endDate: calculatedEndDate || new Date().toISOString().split('T')[0],
        baseAmount: calculationData.base_cost.toFixed(2),
        tariffs: calculationData.tariff_lines.map(line => ({
          type: line.type,
          description: line.description,
          rate: line.rate,
          amount: line.amount.toFixed(2)
        })),
        totalAmount: calculationData.final_cost.toFixed(2),
        status: 'Calculation completed'
      }
      
      setCalculationHistory(prevHistory => [localHistoryEntry, ...prevHistory])
      
      // Show success message with history ID
      const historyId = response?.history?.history_id
      alert(`Calculation saved to history successfully!${historyId ? `\nHistory ID: ${historyId}` : ''}`)
      
      // Refresh history if user is currently on history page
      if (currentPage === 'history') {
        loadUserHistory()
      }
      
    } catch (error) {
      console.error('Failed to save calculation:', error)
      alert('Failed to save calculation. Please try again.')
    }
  }

  // Test function to debug user history retrieval
  const testGetUserHistory = async () => {
    const userId = userProfile?.user_id || 'anonymous'
    console.log('Testing getUserHistory with userId:', userId)
    
    try {
      const history = await getUserHistory(userId)
      console.log('User history retrieved:', history)
      alert(`Found ${history.total || 0} history records for user: ${userId}`)
    } catch (error) {
      console.error('Error getting user history:', error)
      alert(`Failed to get history for user: ${userId}. Error: ${error.message}`)
    }
  }

  // Load user's calculation history from the API (only basic info, no tariff lines)
  const loadUserHistory = async () => {
    const userId = userProfile?.user_id
    if (!userId || userId === 'anonymous') {
      console.log('No valid user ID, skipping history load')
      return
    }

    setIsLoadingHistory(true)
    setHistoryError('')
    
    try {
      console.log('Loading history for user:', userId)
      const response = await getUserHistory(userId)
      
      if (response.code === 200 && response.data) {
        // Transform API response - ONLY basic info for cards (lightweight)
        const transformedHistory = response.data.map(apiHistory => ({
          id: apiHistory.history_id,
          date: apiHistory.created_at ? apiHistory.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          timestamp: apiHistory.created_at ? new Date(apiHistory.created_at).toLocaleString() : new Date().toLocaleString(),
          mode: 'Standard', // Default mode since API doesn't store this
          productType: apiHistory.product_type,
          importingCountry: apiHistory.import_country,
          exportingCountry: apiHistory.export_country,
          quantity: apiHistory.total_qty,
          cost: parseFloat(apiHistory.base_cost) / parseFloat(apiHistory.total_qty) || 0, // Calculate cost per unit
          baseAmount: parseFloat(apiHistory.base_cost).toFixed(2),
          totalAmount: parseFloat(apiHistory.final_cost).toFixed(2),
          status: 'Calculation completed',
          // Keep original API data for reference
          originalApiData: apiHistory,
          // Tariff lines will be loaded on-demand when user clicks "View Detailed Summary"
          tariffs: null, // Not loaded yet
          tariffLinesLoaded: false
        }))
        
        setCalculationHistory(transformedHistory)
        console.log('History loaded successfully:', transformedHistory.length, 'records (tariff details will load on-demand)')
      } else {
        // No history found
        setCalculationHistory([])
        console.log('No history found for user')
      }
    } catch (error) {
      console.error('Failed to load user history:', error)
      setHistoryError('Failed to load calculation history. Please try again.')
      // Keep existing local history if API fails
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Navigation functions
  const showCalculation = () => {
    setCurrentPage('calculation')
  }

  const showHistory = () => {
    setCurrentPage('history')
    // Load history from API when switching to history page
    loadUserHistory()
  }

  // Function to load detailed tariff information for a history item
  const loadDetailedTariffInfo = async (historyItem) => {
    setLoadingTariffDetails(true)
    setSelectedHistoryDetail(null)
    
    try {
      // Check if tariff details are already loaded and cached
      if (historyItem.tariffLinesLoaded && historyItem.tariffs) {
        console.log('Using cached tariff details')
        setSelectedHistoryDetail({
          ...historyItem,
          tariffs: historyItem.tariffs
        })
        return
      }
      
      console.log('Loading tariff details for history ID:', historyItem.id)
      
      // Fetch tariff lines from the history microservice
      const tariffResponse = await getHistoryTariffLines(historyItem.id)
      
      if (tariffResponse.code === 200 && tariffResponse.data) {
        const tariffLines = tariffResponse.data.map(line => ({
          type: line.tariff_type || 'N/A',
          description: line.tariff_desc || 'No description available',
          rate: line.rate_str || '0%',
          amount: line.amount_str || '$0.00'
        }))
        
        console.log('Loaded tariff details:', tariffLines.length, 'lines')
        
        // Create detailed view object
        const detailedInfo = {
          ...historyItem,
          tariffs: tariffLines,
          tariffLinesLoaded: true
        }
        
        // Update the history cache to store loaded data
        setCalculationHistory(prevHistory => 
          prevHistory.map(item => 
            item.id === historyItem.id 
              ? { ...item, tariffs: tariffLines, tariffLinesLoaded: true }
              : item
          )
        )
        
        setSelectedHistoryDetail(detailedInfo)
      } else {
        throw new Error('Failed to load tariff details: ' + (tariffResponse.message || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error loading tariff details:', error)
      alert('Failed to load detailed tariff information. Please try again.')
    } finally {
      setLoadingTariffDetails(false)
    }
  }
  
  // Function to close the detailed tariff modal
  const closeDetailedTariffModal = () => {
    setSelectedHistoryDetail(null)
  }

  // Function to load tariff details on-demand and restore calculation
  const restoreCalculationFromHistory = async (calculationData) => {
    try {
      // Load tariff lines if not already loaded
      if (!calculationData.tariffLinesLoaded && calculationData.id) {
        console.log('Loading tariff details for history:', calculationData.id)
        
        try {
          const tariffResponse = await getHistoryTariffLines(calculationData.id)
          
          if (tariffResponse.code === 200 && tariffResponse.data) {
            const tariffLines = tariffResponse.data.map(line => ({
              type: line.tariff_type,
              description: line.tariff_desc,
              rate: line.rate_str,
              amount: parseFloat(line.amount_str.replace('$', '')).toFixed(2)
            }))
            
            // Update the calculation data with loaded tariff lines
            calculationData.tariffs = tariffLines
            calculationData.tariffLinesLoaded = true
            
            // Update the history state to cache the loaded data
            setCalculationHistory(prevHistory => 
              prevHistory.map(item => 
                item.id === calculationData.id 
                  ? { ...item, tariffs: tariffLines, tariffLinesLoaded: true }
                  : item
              )
            )
            
            console.log('Tariff details loaded successfully:', tariffLines.length, 'lines')
          }
        } catch (error) {
          console.warn('Failed to load tariff details:', error)
          // Continue with restoration even if tariff details fail to load
        }
      }
      
      // Navigate to calculation page
      setCurrentPage('calculation')
      
      // Set manual tariff mode based on saved data
      const isManualMode = calculationData.mode === 'Manual Tariff'
      setIsManualTariff(isManualMode)
      
      // Populate input fields
      setQuantity(calculationData.quantity !== 'Not specified' ? calculationData.quantity : '')
      setCost(calculationData.cost !== 'Not specified' ? calculationData.cost : '')
      
      if (!isManualMode) {
        // Standard mode - populate all fields
        const productOption = calculationData.productType !== 'Not specified' ? 
          { value: calculationData.productType.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: calculationData.productType } : 
          null
        setSelectedProduct(productOption)
        setSelectedImportingCountry(calculationData.importingCountry !== 'Not specified' ? calculationData.importingCountry : '')
        setSelectedExportingCountry(calculationData.exportingCountry !== 'Not specified' ? calculationData.exportingCountry : '')
        setStartDate(calculationData.originalApiData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])
        setEndDate(calculationData.originalApiData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])
      } else {
        // Manual tariff mode - populate tariff rate
        setTariffRate(calculationData.tariffRate !== 'Not specified' ? calculationData.tariffRate : '')
      }
      
      // Set calculated values
      setCalculatedProduct(calculationData.productType !== 'Not specified' ? calculationData.productType : '')
      setCalculatedImportingCountry(calculationData.importingCountry !== 'Not specified' ? calculationData.importingCountry : '')
      setCalculatedExportingCountry(calculationData.exportingCountry !== 'Not specified' ? calculationData.exportingCountry : '')
      setCalculatedQuantity(calculationData.quantity !== 'Not specified' ? calculationData.quantity : '')
      setCalculatedCost(calculationData.cost !== 'Not specified' ? calculationData.cost : '')
      setCalculatedStartDate(calculationData.originalApiData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])
      setCalculatedEndDate(calculationData.originalApiData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])
      setCalculatedTariffRate(calculationData.tariffRate !== 'Not specified' ? calculationData.tariffRate : '')
      
      // Restore tariff data if it exists (now loaded on-demand)
      if (calculationData.tariffs && calculationData.tariffs.length > 0) {
        const restoredTariffData = calculationData.tariffs.map(tariff => ({
          "Tariff Type": tariff.type,
          "Tariff Description": tariff.description,
          "Tariff amount": parseFloat(tariff.rate.replace(/[^0-9.-]/g, '')) || 0
        }))
        setTariffData(restoredTariffData)
      } else {
        setTariffData([])
      }
      
      // Clear any validation errors
      setDateValidationError('')
      setCountryValidationError('')
      
      // Autoscroll to results section after a brief delay to ensure DOM has updated
      setTimeout(() => {
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          })
        }
      }, 100)
      
    } catch (error) {
      console.error('Error restoring calculation from history:', error)
      alert('Failed to load calculation details. Please try again.')
    }
  }

  // Render Calculation page
  const renderCalculationPage = () => (
    <div className="text-center py-8 px-12 max-w-7xl mx-auto">
      <h1 className="text-gray-800 mb-8 text-4xl font-bold">Trade Calculation</h1>
      
      {/* Three containers side by side */}
      <div className="flex flex-col xl:flex-row gap-6 mb-10">
        {/* First Container - Quantity and Cost */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 flex-1">
          <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
            <span className="text-blue-600 mr-2">📊</span>
            Basic Information
          </h3>
          <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start text-left w-full">
            <label htmlFor="quantity">Quantity:</label>
            <input
              type="number"
              id="quantity"
              value={quantity}
              onChange={handleQuantityChange}
              placeholder="Enter value here"
              min="1"
              step="1"
              className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
            />
          </div>

          <div className="flex flex-col items-start text-left w-full">
            <label htmlFor="cost">Cost ($):</label>
            <input
              type="number"
              id="cost"
              value={cost}
              onChange={handleCostChange}
              placeholder="Enter cost here"
              min="0"
              step="0.01"
              className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
            />
          </div>
        </div>
      </div>

      {/* Second Container - Other Fields */}
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-purple-800 flex items-center">
            <span className="text-purple-600 mr-2">⚙️</span>
            Tariff Configuration
          </h3>
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={isManualTariff}
              onChange={handleManualTariffChange}
              className="mr-2"
            />
            Insert manually
          </label>
        </div>
        <div className="flex flex-col gap-4">
          {isManualTariff ? (
          // Manual tariff mode - only show tariff rate field
          <div className="flex flex-col items-start text-left w-full">
            <label htmlFor="tariff-rate">Tariff rate (%):</label>
            <input
              type="number"
              id="tariff-rate"
              value={tariffRate}
              onChange={handleTariffRateChange}
              placeholder="Enter tariff rate (0-100)"
              min="0"
              max="100"
              step="0.01"
              className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder-gray-500"
            />
          </div>
        ) : (
          // Normal mode - show all other fields
          <>
            <div className="flex flex-col items-start text-left w-full">
              <label htmlFor="product-type">Product Type:</label>
              <ProductAutocomplete
                value={selectedProduct}
                onChange={handleProductChange}
                placeholder="Search and select a product..."
                disabled={isLoadingCountries}
                className="w-full"
              />
            </div>

            <div className="flex flex-col items-start text-left w-full">
              <label htmlFor="importing-country">Importing Country:</label>
              <select 
                id="importing-country" 
                value={selectedImportingCountry} 
                onChange={handleImportingCountryChange}
                className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                disabled={isLoadingCountries}
              >
                <option value="">
                  {isLoadingCountries ? 'Loading countries...' : 'Select importing country...'}
                </option>
                {!isLoadingCountries && countries.map(country => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-start text-left w-full">
              <label htmlFor="exporting-country">Exporting Country:</label>
              <select 
                id="exporting-country" 
                value={selectedExportingCountry} 
                onChange={handleExportingCountryChange}
                className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                disabled={isLoadingCountries}
              >
                <option value="">
                  {isLoadingCountries ? 'Loading countries...' : 'Select exporting country...'}
                </option>
                {!isLoadingCountries && countries.map(country => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Country validation error message */}
            {countryValidationError && (
              <div className="text-red-500 text-sm mt-1 mb-2">
                ⚠️ {countryValidationError}
              </div>
            )}

            <div className="flex flex-col items-start text-left w-full">
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
              />
            </div>

            <div className="flex flex-col items-start text-left w-full">
              <label htmlFor="end-date">End Date:</label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
              />
            </div>
            
            {/* Date validation error message */}
            {dateValidationError && (
              <div className="text-red-500 text-sm mt-1 mb-2">
                ⚠️ {dateValidationError}
              </div>
            )}
          </>
        )}
        </div>
      </div>

        {/* Third Container - Calculation Results */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200 flex-1">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
            <span className="text-green-600 mr-2">🎯</span>
            Calculation Results
          </h3>
          <div className="text-left text-sm">
            {/* Calculate Button */}
            <div className="mb-4">
              {/* Hint to recalculate when fields are modified */}
              {fieldsModified && (
                <div className="text-orange-500 text-xs font-medium flex items-center gap-1 mb-2">
                  <span className="text-sm">⚠️</span>
                  <span>Fields modified. Click Calculate to update.</span>
                </div>
              )}
              
              <button 
                className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold py-3 px-6 text-base rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 disabled:transform-none disabled:shadow-none uppercase tracking-wider"
                onClick={handleCalculate}
                disabled={
                  // Always require quantity and cost
                  !quantity || !cost || 
                  // Disable if countries are still loading
                  isLoadingCountries ||
                  // For manual tariff mode, require tariff rate
                  (isManualTariff && !tariffRate) ||
                  // For standard mode, require all fields and no validation errors
                  (!isManualTariff && (
                    !selectedProduct || 
                    !selectedImportingCountry || 
                    !selectedExportingCountry || 
                    !startDate || 
                    !endDate ||
                    dateValidationError !== '' || 
                    countryValidationError !== ''
                  ))
                }
              >
                {isLoadingCountries ? 'Loading...' : 'Calculate'}
              </button>
            </div>

            {/* Loading indicator for tariffs */}
            {isLoadingTariffs && (
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-blue-700 font-medium text-xs">Loading tariff data...</span>
              </div>
            )}

            {/* Base Quantity Cost calculation */}
            {(quantity && cost) || (calculatedQuantity && calculatedCost) ? (
              <div className="mb-4">
                <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <span className="text-green-500 mr-1">🧮</span>
                  Base Cost
                </div>
                {quantity && cost && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>
                        <span className="text-blue-600 font-semibold">{Number(quantity).toLocaleString()}</span>
                        <span className="text-gray-500 mx-1">×</span>
                        <span className="text-green-600 font-semibold">${Number(cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </span>
                      <span className="text-red-600 font-bold">${(Number(quantity) * Number(cost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Tariff Calculations */}
            {tariffData.length > 0 && calculatedQuantity && calculatedCost && (
              <div className="mb-4">
                <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <span className="text-purple-500 mr-1">💰</span>
                  Tariffs
                </div>
                <div className="space-y-2">
                  {tariffData.map((tariff, index) => {
                    const baseAmount = Number(calculatedQuantity) * Number(calculatedCost)
                    const tariffAmount = calculateTariffAmount(
                      tariff["Tariff Type"], 
                      calculatedQuantity, 
                      baseAmount, 
                      tariff["Tariff amount"]
                    )
                    
                    return (
                      <div key={index} className="bg-purple-50 p-2 rounded border border-purple-200">
                        <div className="font-semibold text-purple-700 text-xs mb-1">
                          {tariff["Tariff Description"]} 
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">
                            ({tariff["Tariff Type"]}, {tariff["Tariff Type"].toLowerCase() === 'specific' ? `$${Number(tariff["Tariff amount"]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per unit` : `${tariff["Tariff amount"]}%`})
                          </span>
                          <span className="text-red-600 font-bold">${tariffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Total with all tariffs */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border-2 border-green-300 mt-3">
                  <div className="text-sm font-bold text-gray-800 mb-1 flex items-center">
                    <span className="text-green-500 mr-1">🎯</span>
                    Total Amount
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">
                      Base + Tariffs = 
                    </span>
                    <span className="text-green-600 font-bold text-lg">
                      ${(() => {
                        const baseAmount = Number(calculatedQuantity) * Number(calculatedCost)
                        const totalTariffs = tariffData.reduce((sum, tariff) => {
                          const tariffAmount = calculateTariffAmount(
                            tariff["Tariff Type"], 
                            calculatedQuantity, 
                            baseAmount, 
                            tariff["Tariff amount"]
                          )
                          return sum + tariffAmount
                        }, 0)
                        return (baseAmount + totalTariffs).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Save Calculation Button */}
            <div className="mt-4 pt-3 border-t border-gray-200">
              <button 
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold py-2 px-4 text-sm rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none mb-2"
                onClick={handleSaveCalculation}
                disabled={
                  // No calculated results to save
                  (!calculatedQuantity && !calculatedCost) ||
                  // For manual tariff mode, need tariff rate calculated
                  (isManualTariff && !calculatedTariffRate) ||
                  // For standard mode, need basic calculation done
                  (!isManualTariff && (!calculatedProduct || !calculatedImportingCountry || !calculatedExportingCountry))
                }
              >
                Save Calculation
              </button>
              
              {/* Test Get History Button */}
              <button 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 text-sm rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                onClick={testGetUserHistory}
              >
                Test Get History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Render History page
  const renderHistoryPage = () => (
    <div className="text-center py-8 px-12 max-w-4xl mx-auto">
      <h1 className="text-gray-800 mb-8 text-4xl font-bold">Calculation History</h1>
      <div className="history-content">
        <p>Here you can view your saved trade calculations and search history.</p>
        
        {/* Loading indicator */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-200 mb-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-blue-700 font-medium">Loading your calculation history...</span>
          </div>
        )}

        {/* Error message */}
        {historyError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <span className="text-red-700">{historyError}</span>
            </div>
            <button 
              onClick={loadUserHistory}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="history-placeholder">
          <h3>Saved Calculations ({calculationHistory.length})</h3>
          
          {!isLoadingHistory && calculationHistory.length === 0 ? (
            <div className="no-history">
              <p>No calculations saved yet. Go to the Calculation page to create and save calculations.</p>
            </div>
          ) : (
            calculationHistory.map(calculation => (
              <div key={calculation.id} className="history-item">
                {/* Concise History Card Header */}
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-800">Calculation #{calculation.id}</h4>
                  <span className="text-sm text-gray-500">{calculation.date}</span>
                </div>
                
                {/* Concise History Card - Only Essential Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1">
                    <p><strong>Product:</strong> {calculation.productType || 'Not specified'}</p>
                    <p><strong>Quantity:</strong> {calculation.quantity || 'Not specified'}</p>
                    <p><strong>Cost per Unit:</strong> {calculation.cost !== 'Not specified' ? `$${calculation.cost}` : 'Not specified'}</p>
                  </div>
                  <div className="space-y-1">
                    <p><strong>From:</strong> {calculation.exportingCountry || 'Not specified'}</p>
                    <p><strong>To:</strong> {calculation.importingCountry || 'Not specified'}</p>
                    <p className="text-lg font-semibold text-green-600"><strong>Total:</strong> {calculation.totalAmount !== 'Not calculated' ? `$${Number(calculation.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Not calculated'}</p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-4 pt-2.5 border-t border-gray-300 flex gap-2 flex-wrap">
                  <button 
                    onClick={() => loadDetailedTariffInfo(calculation)}
                    disabled={loadingTariffDetails}
                    className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white border-none py-2 px-4 rounded cursor-pointer text-sm font-bold transition-colors duration-200"
                  >
                    {loadingTariffDetails ? 'Loading...' : 'View Detailed Summary'}
                  </button>
                  
                  <button 
                    onClick={() => restoreCalculationFromHistory(calculation)}
                    className="bg-green-500 hover:bg-green-600 text-white border-none py-2 px-4 rounded cursor-pointer text-sm font-bold transition-colors duration-200"
                  >
                    Restore Calculation
                  </button>
                </div>
                
                {/* Show JSON data for debugging */}
                <details className="json-details">
                  <summary>View JSON Data</summary>
                  <pre className="json-display">
                    {JSON.stringify(calculation, null, 2)}
                  </pre>
                </details>
              </div>
            ))
          )}
        </div>
        
        {/* Manual Refresh Button */}
        <div className="mt-6">
          <button 
            onClick={loadUserHistory}
            disabled={isLoadingHistory}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors duration-200"
          >
            {isLoadingHistory ? 'Loading...' : 'Refresh History'}
          </button>
        </div>
        
        {/* Sample data section - only show if no real history and not loading */}
        {!isLoadingHistory && calculationHistory.length === 0 && !historyError && (
          <div className="history-placeholder">
            <h3>Sample History Data</h3>
            <div className="history-item sample-item">
              <p><strong>Date:</strong> 2025-09-12</p>
              <p><strong>Product:</strong> Electronics</p>
              <p><strong>Route:</strong> China → United States</p>
              <p><strong>Result:</strong> Sample calculation</p>
            </div>
            
            <div className="history-item sample-item">
              <p><strong>Date:</strong> 2025-09-11</p>
              <p><strong>Product:</strong> Textiles</p>
              <p><strong>Route:</strong> Singapore → China</p>
              <p><strong>Result:</strong> Sample calculation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="bg-slate-700 text-white p-0 shadow-sm sticky top-0 z-50 w-full">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {/* Icon - using vite.svg from public folder */}
            <img 
              src="/vite.svg" 
              alt="Tariff-fic Logo" 
              className="w-8 h-8 object-contain"
            />
            <h2 className="text-gray-100 m-0 text-2xl font-bold">Tariff-fic</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              className={`${currentPage === 'calculation' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-transparent text-gray-300 hover:bg-slate-600 hover:text-gray-100'} border-none py-3 px-6 text-base cursor-pointer rounded-md transition-all duration-300 font-medium`}
              onClick={showCalculation}
            >
              Calculation
            </button>
            <button 
              className={`${currentPage === 'history' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-transparent text-gray-300 hover:bg-slate-600 hover:text-gray-100'} border-none py-3 px-6 text-base cursor-pointer rounded-md transition-all duration-300 font-medium`}
              onClick={showHistory}
            >
              History
            </button>
            {/* User info and Logout */}
            <div className="hidden sm:flex items-center gap-3 pl-4 ml-2 border-l border-slate-600">
              {userProfile && (
                <div className="text-sm text-gray-200">
                  <div className="font-semibold leading-4">{userProfile.name || 'User'}</div>
                  <div className="text-xs text-gray-400">{(userProfile.role || 'user').toString()}</div>
                </div>
              )}
              <button
                className="bg-orange-500 hover:bg-orange-600 text-white border-none py-2 px-4 text-sm cursor-pointer rounded-md transition-all duration-300 font-medium"
                onClick={async () => {
                  try { await logOut() } catch {}
                  try { setUserProfile(null) } catch {}
                  try { localStorage.removeItem('profileSetupPending') } catch {}
                  navigate('/', { replace: true })
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="w-full min-h-[calc(100vh-80px)] px-8">
        {currentPage === 'calculation' ? renderCalculationPage() : renderHistoryPage()}
      </div>
      
      {/* Detailed Tariff Modal */}
      {selectedHistoryDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Detailed Tariff Summary</h2>
              <button 
                onClick={closeDetailedTariffModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              {/* Basic Calculation Information */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Calculation Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Product:</strong> {selectedHistoryDetail.productType}</p>
                    <p><strong>Importing Country:</strong> {selectedHistoryDetail.importingCountry}</p>
                    <p><strong>Exporting Country:</strong> {selectedHistoryDetail.exportingCountry}</p>
                    <p><strong>Mode:</strong> {selectedHistoryDetail.mode}</p>
                  </div>
                  <div>
                    <p><strong>Quantity:</strong> {selectedHistoryDetail.quantity}</p>
                    <p><strong>Cost:</strong> ${Number(selectedHistoryDetail.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p><strong>Date:</strong> {new Date(selectedHistoryDetail.originalApiData?.created_at).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span className={`font-semibold ${selectedHistoryDetail.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'}`}>{selectedHistoryDetail.status}</span></p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded">
                  <p className="text-lg font-bold text-green-600">
                    Total Amount: ${Number(selectedHistoryDetail.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              {/* Detailed Tariff Breakdown */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Tariff Breakdown</h3>
                {selectedHistoryDetail.tariffs && selectedHistoryDetail.tariffs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Tariff Type</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Description</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Rate</th>
                          <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedHistoryDetail.tariffs.map((tariff, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2 font-medium">{tariff.type}</td>
                            <td className="border border-gray-300 px-4 py-2">{tariff.description}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right">{tariff.rate}</td>
                            <td className="border border-gray-300 px-4 py-2 text-right font-medium">{tariff.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No detailed tariff information available.</p>
                    <p className="text-sm mt-2">This may be a manual tariff calculation or the data may not have been saved with detailed breakdown.</p>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button 
                  onClick={() => restoreCalculationFromHistory(selectedHistoryDetail)}
                  className="bg-green-500 hover:bg-green-600 text-white border-none py-2 px-6 rounded cursor-pointer font-bold transition-colors duration-200"
                >
                  Restore This Calculation
                </button>
                <button 
                  onClick={closeDetailedTariffModal}
                  className="bg-gray-500 hover:bg-gray-600 text-white border-none py-2 px-6 rounded cursor-pointer font-bold transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
