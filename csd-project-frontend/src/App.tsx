import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './lib/AuthContext'
import { fetchCountries } from './lib/countryService'
import { saveCalculation, getUserHistory, getHistoryTariffLines } from './lib/historyService'
import ProductAutocomplete from './lib/ProductAutocomplete'
import tariffService from './lib/tariffService'
import agreementService from './lib/agreementService'
import forecastService from './lib/forecastService'
import { Country, ProductOption, TariffData, CalculationData, Agreement, ComparisonResult } from './types'
import { CostBreakdownPieChart } from './components/CostBreakdownPieChart'
import { Skeleton } from './components/ui/Skeleton'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/Card'
import { Button } from './components/ui/Button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/Popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/Select'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from './lib/utils'
import './App.css'

interface AppProps {
  onManagementClick?: () => void
  managementContent?: React.ReactNode
  showManagement?: boolean
  onCalculationClick?: () => void
  onHistoryClick?: () => void
}

function App({ onManagementClick, managementContent, showManagement = false, onCalculationClick, onHistoryClick }: AppProps = {}) {
  const navigate = useNavigate()
  const { userProfile, logOut, setUserProfile } = useAuth()
  // Ref for autoscroll to results section
  const resultsRef = useRef<HTMLDivElement>(null)
  // Ref for autoscroll to pie chart section
  const pieChartRef = useRef<HTMLDivElement>(null)
  
  // State for page navigation
  const [currentPage, setCurrentPage] = useState<string>('calculation')
  
  // State for storing selected values
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null) // Changed to object for React Select
  const [selectedImportingCountry, setSelectedImportingCountry] = useState<string>('')
  const [selectedExportingCountry, setSelectedExportingCountry] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [cost, setCost] = useState<string>('')
  const [date, setDate] = useState<string>('')
  
  // State for combobox open/close
  const [importingCountryOpen, setImportingCountryOpen] = useState(false)
  const [exportingCountryOpen, setExportingCountryOpen] = useState(false)
  
  // State for multi-exporter comparison mode
  const [isComparisonMode, setIsComparisonMode] = useState(false)
  const [exportingCountries, setExportingCountries] = useState<string[]>(['']) // Array of exporter countries
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[] | null>(null)
  const [isLoadingComparison, setIsLoadingComparison] = useState(false)
  
  // State for tracking which comparison cards are expanded
  const [expandedComparisonCards, setExpandedComparisonCards] = useState<Set<number>>(new Set())
  
  // Initialize date to current date on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD
    setDate(today)
  }, [])
  
  // State for tariff input mode: 'normal' or 'manual'
  const [tariffMode, setTariffMode] = useState<'normal' | 'manual'>('normal')
  const [tariffRate, setTariffRate] = useState<string>('')
  
  // State for predicted calculation results
  const [predictedResults, setPredictedResults] = useState<any>(null)
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false)
  const [predictionError, setPredictionError] = useState<string>('')
  
  // State for calculated values (only updated when calculate button is clicked)
  const [calculatedProduct, setCalculatedProduct] = useState<string>('')
  const [calculatedImportingCountry, setCalculatedImportingCountry] = useState<string>('')
  const [calculatedExportingCountry, setCalculatedExportingCountry] = useState<string>('')
  const [calculatedQuantity, setCalculatedQuantity] = useState<string>('')
  const [calculatedCost, setCalculatedCost] = useState<string>('')
  const [calculatedDate, setCalculatedDate] = useState<string>('')
  const [calculatedTariffRate, setCalculatedTariffRate] = useState<string>('')
  
  // State for API tariff data
  const [tariffData, setTariffData] = useState<TariffData[]>([])
  const [isLoadingTariffs, setIsLoadingTariffs] = useState<boolean>(false)
  
  // State for agreements data
  const [agreementsData, setAgreementsData] = useState<Agreement[]>([])
  const [isLoadingAgreements, setIsLoadingAgreements] = useState<boolean>(false)
  
  // State for saved calculation history
  const [calculationHistory, setCalculationHistory] = useState<CalculationData[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [historyError, setHistoryError] = useState<string>('')
  
  // State for date validation
  const [dateValidationError, setDateValidationError] = useState<string>('')
  
  // State for country validation
  const [countryValidationError, setCountryValidationError] = useState<string>('')
  
  // State to track if fields have been modified after calculation
  const [fieldsModified, setFieldsModified] = useState<boolean>(false)

  // State for countries from API
  const [countries, setCountries] = useState<Country[]>([])
  const [isLoadingCountries, setIsLoadingCountries] = useState<boolean>(true)
  
  // State for detailed tariff view modal
  const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<CalculationData | null>(null)
  const [loadingTariffDetails, setLoadingTariffDetails] = useState(false)

  // State for showing detailed calculation card
  const [showDetailedCard, setShowDetailedCard] = useState(false)

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
  const getCountryCode = (countryName: string): string | null => {
    if (!countryName) return null
    const country = countries.find(c => c.name === countryName)
    return country ? country.code : null
  }

  // Handle dropdown changes
  const handleProductChange = (selectedOption: ProductOption | null) => {
    setSelectedProduct(selectedOption)
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
  }

  const handleImportingCountryChange = (value: string) => {
    setSelectedImportingCountry(value)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Validate countries are different if both are selected
    if (value && selectedExportingCountry && value === selectedExportingCountry) {
      setCountryValidationError('Importing and exporting countries cannot be the same')
    } else {
      setCountryValidationError('')
    }
  }

  const handleExportingCountryChange = (value: string) => {
    setSelectedExportingCountry(value)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Validate countries are different if both are selected
    if (selectedImportingCountry && value && selectedImportingCountry === value) {
      setCountryValidationError('Importing and exporting countries cannot be the same')
    } else {
      setCountryValidationError('')
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Allow positive numbers (including decimals)
    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0)) {
      setCost(value)
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true)
      }
    }
  }

  const handleTariffModeChange = (value: 'normal' | 'manual') => {
    setTariffMode(value)
    // Clear manual tariff rate when switching to normal
    if (value === 'normal') {
      setTariffRate('')
    }
    // Clear validation errors
    setCountryValidationError('')
    setDateValidationError('')
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
  }

  const handleTariffRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Only allow numbers between 0 and 100 (inclusive, with decimals)
    if (value === '' || (!isNaN(Number(value)) && Number(value) >= 0 && Number(value) <= 100)) {
      setTariffRate(value)
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true)
      }
    }
  }

  // Get predicted tariff and run calculation with it
  const handlePredictCalculation = async () => {
    setIsLoadingPrediction(true)
    setPredictionError('')
    setPredictedResults(null)

    try {
      // Validate inputs - use the current calculated values
      if (!calculatedProduct) {
        setPredictionError('Please run a calculation first before predicting')
        return
      }

      if (!calculatedImportingCountry || !calculatedExportingCountry) {
        setPredictionError('Missing country information from calculation')
        return
      }

      // Get country codes from calculated values
      const importerCode = getCountryCode(calculatedImportingCountry)
      const exporterCode = getCountryCode(calculatedExportingCountry)

      if (!importerCode || !exporterCode) {
        setPredictionError('Invalid country selection')
        return
      }

      // Call forecast service with product name
      const predictedTariffRate = await forecastService.getPredictedTariff(
        calculatedProduct,
        importerCode,
        exporterCode,
        1 // horizon: 1 month ahead
      )

      console.log('Predicted tariff rate:', predictedTariffRate)

      // Now run a full calculation using the predicted tariff rate
      // Use the getEffectiveTariffByNames method
      const tariffRequest = {
        product_name: calculatedProduct,
        import_country: calculatedImportingCountry,
        export_country: calculatedExportingCountry,
        date: calculatedDate
      }

      const fetchedTariffData = await tariffService.getEffectiveTariffByNames(tariffRequest)

      if (!fetchedTariffData || !fetchedTariffData.tariffs || fetchedTariffData.tariffs.length === 0) {
        setPredictionError('Could not fetch tariff data for prediction')
        return
      }

      // Calculate with predicted ad valorem rate
      const numericQuantity = parseFloat(calculatedQuantity)
      const numericCost = parseFloat(calculatedCost)

      const totalCost = numericQuantity * numericCost
      const tariffCost = (totalCost * predictedTariffRate) / 100
      const totalWithTariff = totalCost + tariffCost

      // Fetch agreements data
      const agreementsData = await agreementService.getActiveAgreements(
        calculatedImportingCountry,
        calculatedExportingCountry,
        calculatedDate
      )

      // Store predicted results
      const predictedCalc = {
        product: calculatedProduct,
        hsCode: fetchedTariffData.tariffs[0].hscode,
        importingCountry: calculatedImportingCountry,
        exportingCountry: calculatedExportingCountry,
        quantity: calculatedQuantity,
        cost: calculatedCost,
        date: calculatedDate,
        tariffRate: predictedTariffRate.toString(),
        totalCost,
        tariffCost,
        totalWithTariff,
        tariffData: fetchedTariffData.tariffs,
        agreements: agreementsData,
        isPredicted: true
      }

      setPredictedResults(predictedCalc)

      // Scroll to predicted results
      setTimeout(() => {
        const predictedSection = document.getElementById('predicted-results')
        if (predictedSection) {
          predictedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)

    } catch (error) {
      console.error('Error during prediction:', error)
      setPredictionError(`Failed to generate prediction: ${(error as any).message}`)
    } finally {
      setIsLoadingPrediction(false)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value
    setDate(newDate)
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true)
    }
    
    // Clear any previous date validation errors since we now have a single date
    setDateValidationError('')
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
          // Product name is selected - use the by-names endpoint
          // Check if we have all required data for the by-names endpoint
          if (selectedImportingCountry && selectedExportingCountry && date) {
            
            // Use apiName (single word) if available, otherwise fall back to full label
            const productNameForApi = selectedProduct.apiName || selectedProduct.label
            
            // Call the by-names endpoint
            const tariff = await tariffService.getEffectiveTariffByNames({
              productName: productNameForApi,
              importerCountryName: selectedImportingCountry,
              exporterCountryName: selectedExportingCountry,
              date: date
            })
            
            if (tariff) {
              tariffs = [tariff] // Wrap in array for consistent handling
            } else {
              // Don't return early - continue with empty tariffs array so agreements can still be applied
              tariffs = []
            }
          } else {
            // Missing required data for by-names endpoint
            setTariffData([])
            setIsLoadingTariffs(false)
            alert('Please select importing country, exporting country, and date to search by product name.')
            // Don't return - let the function continue to set empty tariff data
            tariffs = []
          }
        }
      }
      
      // Handle HS code lookup (when entered directly)
      if (hsCode) {
        // Call tariff service with HS code
        if (selectedImportingCountry && selectedExportingCountry) {
          // Convert country names to ISO codes before API call
          const importerCode = getCountryCode(selectedImportingCountry)
          const exporterCode = getCountryCode(selectedExportingCountry)
          
          if (!importerCode || !exporterCode) {
            throw new Error(`Could not find country codes for: ${selectedImportingCountry} -> ${selectedExportingCountry}`)
          }
          
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
      }
      
      // Transform API response to match existing UI format (applies to both HS code and product name lookups)
      if (tariffs.length > 0) {
        const transformedTariffs = tariffs.map(tariff => {
          // Map ISO codes to country names for display
          const importerName = countries.find(c => c.code === tariff.importerId)?.name || tariff.importerId
          const exporterName = countries.find(c => c.code === tariff.exporterId)?.name || tariff.exporterId
          
          // Get tariff amount based on tariff type
          let tariffAmount = 0
          const tariffType = (tariff.tariffType || 'ad_valorem').toLowerCase()
          
          if (tariffType === 'ad_valorem' || tariffType === 'percentage') {
            // For ad valorem tariffs, use tariffRate (percentage)
            tariffAmount = tariff.tariffRate || 0
          } else if (tariffType === 'specific') {
            // For specific tariffs, use specificAmt
            tariffAmount = tariff.specificAmt || 0
          } else if (tariffType === 'compound') {
            // For compound tariffs, we'll use tariffRate as primary (ad valorem component)
            tariffAmount = tariff.tariffRate || 0
          } else {
            // Default to tariffRate
            tariffAmount = tariff.tariffRate || 0
          }
          
          return {
            "Tariff Type": tariff.tariffType || 'ad_valorem',
            "Tariff Description": `${importerName} → ${exporterName} (HS: ${tariff.hsCode})`,
            "Tariff amount": tariffAmount,
            "originalData": tariff // Keep original data for reference
          }
        })
        
        setTariffData(transformedTariffs)
      } else {
        // No tariffs found
        setTariffData([])
      }
    } catch (error) {
      console.error('Failed to fetch tariff data:', error)
      const errorMessage = (error as any).message || 'Unknown error'
      
      // Provide more helpful error messages
      if (errorMessage.includes('500')) {
        alert(`Failed to fetch tariff data: The server encountered an error.\n\nPossible causes:\n- Product "${selectedProduct?.label}" may not be found in the database\n- Product or Country microservices may not be running\n- Try using HS code input mode instead\n\nTechnical error: ${errorMessage}`)
      } else if (errorMessage.includes('404')) {
        alert(`No tariff data found for:\n- Product: ${selectedProduct?.label}\n- From: ${selectedExportingCountry}\n- To: ${selectedImportingCountry}\n- Date: ${date}\n\nTry a different product or country combination.`)
      } else {
        alert(`Failed to fetch tariff data: ${errorMessage}`)
      }
      
      setTariffData([])
    } finally {
      setIsLoadingTariffs(false)
    }
    
    return tariffData
  }

  // Fetch agreements data from Agreement microservice
  const fetchAgreementsData = async () => {
    // Only fetch agreements if we have both countries and date
    if (!selectedImportingCountry || !selectedExportingCountry) {
      return
    }

    setIsLoadingAgreements(true)
    
    try {
      const agreements = await agreementService.getActiveAgreements(
        selectedImportingCountry,
        selectedExportingCountry,
        date
      )
      
      setAgreementsData(agreements)
    } catch (error) {
      console.error('Failed to fetch agreements:', error)
      // Don't show alert for agreements failure - it's optional data
      // Just log the error and continue with empty agreements
      setAgreementsData([])
    } finally {
      setIsLoadingAgreements(false)
    }
  }

  /**
   * Feature 1: Backend data fetching function for multi-country comparison
   * Fetches tariffs per country pair and all agreements, then calculates totals
   * 
   * @param importerCountry - Single importing country name
   * @param exporterCountries - Array of exporting country names to compare
   * @param product - Product option object with HS code
   * @param quantity - Quantity of goods
   * @param goodsValue - Cost/value of goods
   * @param date - Date for tariff/agreement lookup (YYYY-MM-DD)
   * @returns Array of comparison results sorted by final total (ascending)
   */
  const fetchComparisonData = async (
    importerCountry: string,
    exporterCountries: string[],
    product: ProductOption,
    quantity: number,
    goodsValue: number,
    date: string
  ): Promise<ComparisonResult[]> => {
    try {
      // Step 1: Get product HS code (only if not already provided)
      let hsCode = ''
      if (product.isHsCode) {
        hsCode = product.value
      }

      // Step 2: Fetch ALL agreements once (filter by importer, will filter by exporter per country)
      const allAgreements = await agreementService.getAllAgreements(importerCountry, undefined, date)

      // Step 3: Get country codes for API calls
      const importerCode = getCountryCode(importerCountry)
      if (!importerCode) {
        throw new Error(`Could not find country code for importer: ${importerCountry}`)
      }

      const exporterCodes = exporterCountries.map(name => ({
        name,
        code: getCountryCode(name)
      }))

      // Step 4: Process each exporter country
      const results: ComparisonResult[] = []

      for (const exporter of exporterCodes) {
        if (!exporter.code) {
          continue
        }

        // Fetch tariffs for this specific country pair
        let countryTariffs: any[] = []
        
        if (hsCode) {
          // If we have HS code, use getTariffsByCombo with country codes
          try {
            countryTariffs = await tariffService.getTariffsByCombo(hsCode, importerCode, exporter.code)
          } catch (error) {
            countryTariffs = []
          }
        } else {
          // If product name, use getEffectiveTariffByNames with country names
          try {
            const tariffResult = await tariffService.getEffectiveTariffByNames({
              productName: product.apiName || product.value,
              importerCountryName: importerCountry,  // Use country name, not code
              exporterCountryName: exporter.name,    // Use country name, not code
              date: date
            })
            
            // getEffectiveTariffByNames returns a single object, not array
            countryTariffs = tariffResult ? [tariffResult] : []
            
            // Extract HS code from first result for future reference
            if (!hsCode && countryTariffs.length > 0 && countryTariffs[0].hs_code) {
              hsCode = countryTariffs[0].hs_code
            }
          } catch (error) {
            countryTariffs = []
          }
        }

        // Filter agreements for this country pair
        const countryAgreements = allAgreements.filter(agreement =>
          agreement.exporterId === exporter.code
        )

        // Calculate base cost
        const baseCost = goodsValue * quantity

        // Check for override agreement first
        const overrideAgreement = countryAgreements.find(a => a.kind === 'override')
        const hasOverride = !!overrideAgreement

        // Calculate total tariff amount (skip if override exists)
        let totalTariffAmount = 0
        let effectiveTariffRate = 0

        if (!hasOverride && countryTariffs.length > 0) {
          // Calculate tariff amounts for each tariff type using tariffService
          for (const tariff of countryTariffs) {
            const result = tariffService.calculateTariffAmount(tariff, baseCost, quantity)
            const amount = typeof result === 'number' ? result : result.tariffAmount
            totalTariffAmount += amount
          }
          effectiveTariffRate = (totalTariffAmount / baseCost) * 100
        }

        // Calculate agreement adjustments
        let adjustedTariffAmount = totalTariffAmount
        let totalAgreementAdjustment = 0

        if (countryAgreements.length > 0) {
          // Apply agreements in sequence
          countryAgreements.forEach(agreement => {
            if (agreement.kind === 'override') {
              // Override: replace tariffs with agreement percentage of base cost
              const overrideAmount = baseCost * agreement.value
              totalAgreementAdjustment = overrideAmount - totalTariffAmount
              adjustedTariffAmount = overrideAmount
            } else if (agreement.kind === 'surcharge') {
              // Surcharge: add percentage of base cost to tariffs
              const surchargeAmount = baseCost * agreement.value
              totalAgreementAdjustment += surchargeAmount
              adjustedTariffAmount += surchargeAmount
            } else if (agreement.kind === 'multiplier') {
              // Multiplier: multiply existing tariffs
              const beforeMultiplier = adjustedTariffAmount
              adjustedTariffAmount *= agreement.value
              totalAgreementAdjustment += (adjustedTariffAmount - beforeMultiplier)
            }
          })
        }

        // Calculate final total
        const finalTotal = baseCost + adjustedTariffAmount

        // Convert tariffs to TariffData format for display
        const formattedTariffs: TariffData[] = countryTariffs.map(tariff => {
          // Map the correct field names from API response
          const tariffType = tariff.tariffType || tariff.type || 'ad_valorem'
          const tariffRate = tariff.tariffRate || tariff.rate || 0
          const specificAmt = tariff.specificAmt || 0
          
          // Determine the tariff amount to display based on type
          let displayAmount = 0
          const tariffTypeLower = tariffType.toLowerCase()
          
          if (tariffTypeLower === 'specific') {
            displayAmount = specificAmt
          } else if (tariffTypeLower === 'ad_valorem' || tariffTypeLower === 'percentage') {
            displayAmount = tariffRate
          } else if (tariffTypeLower === 'compound') {
            displayAmount = tariffRate // Show ad valorem component for compound
          } else {
            displayAmount = tariffRate
          }
          
          // Get country names for description
          const importerName = countries.find(c => c.code === tariff.importerId)?.name || tariff.importerId
          const exporterName = countries.find(c => c.code === tariff.exporterId)?.name || tariff.exporterId
          
          return {
            id: tariff.id?.toString() || '',
            'Tariff Type': tariffType,
            'Tariff amount': displayAmount,
            'Tariff Description': tariff.description || `${exporterName} → ${importerName} (HS: ${tariff.hsCode || tariff.hscode || 'N/A'})`,
            originalData: tariff
          }
        })

        // Add result
        results.push({
          exporterCountry: exporter.name,
          tariffs: formattedTariffs,
          agreements: countryAgreements,
          baseCost,
          totalTariffAmount,
          adjustedTariffAmount,
          totalAgreementAdjustment,
          finalTotal,
          effectiveTariffRate,
          hasOverride
        })
      }

      // Step 5: Sort by final total (ascending - cheapest first)
      results.sort((a, b) => a.finalTotal - b.finalTotal)

      return results

    } catch (error) {
      throw error
    }
  }

  // Handle calculate button click
  const handleCalculate = async () => {
    // Clear ALL previous results (both single and comparison)
    setCalculatedProduct('')
    setCalculatedImportingCountry('')
    setCalculatedExportingCountry('')
    setCalculatedQuantity('')
    setCalculatedCost('')
    setCalculatedDate('')
    setCalculatedTariffRate('')
    setTariffData([])
    setAgreementsData([])
    setComparisonResults(null)
    setShowDetailedCard(false)
    setExpandedComparisonCards(new Set())
    
    // Reset fields modified flag since we're recalculating
    setFieldsModified(false)
    
    // Check if we're in comparison mode
    if (isComparisonMode) {
      // Validate that we have at least 2 exporters
      const validExporters = exportingCountries.filter(country => country.trim() !== '')
      
      if (validExporters.length < 2) {
        alert('Please select at least 2 exporting countries for comparison.')
        return
      }
      
      // Validate other required fields
      if (!selectedImportingCountry || !selectedProduct || !quantity || !cost || !date) {
        alert('Please fill in all required fields.')
        return
      }
      
      // Set basic calculated values for display
      setCalculatedProduct(selectedProduct?.label || '')
      setCalculatedImportingCountry(selectedImportingCountry)
      setCalculatedQuantity(quantity)
      setCalculatedCost(cost)
      setCalculatedDate(date)
      
      setIsLoadingComparison(true)
      
      try {
        if (!selectedProduct) {
          throw new Error('Product is not selected')
        }
        
        const results = await fetchComparisonData(
          selectedImportingCountry,
          validExporters,
          selectedProduct,
          Number(quantity),
          Number(cost),
          date
        )
        
        setComparisonResults(results)
        
        // Scroll to results
        setTimeout(() => {
          if (pieChartRef.current) {
            pieChartRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            })
          }
        }, 300)
      } catch (error) {
        alert(`Comparison failed: ${(error as Error).message}`)
      } finally {
        setIsLoadingComparison(false)
      }
      
      return
    }
    
    // Regular single-exporter calculation mode
    // Set basic calculated values
    setCalculatedProduct(selectedProduct?.label || '')
    setCalculatedImportingCountry(selectedImportingCountry)
    setCalculatedExportingCountry(selectedExportingCountry)
    setCalculatedQuantity(quantity)
    setCalculatedCost(cost)
    setCalculatedDate(date)
    setCalculatedTariffRate(tariffRate)
    
    // Fetch tariff data and agreements in parallel
    if (quantity && cost) {
      await Promise.all([
        fetchTariffData(),
        fetchAgreementsData()
      ])
      
      // Autoscroll to pie chart section after data is loaded
      setTimeout(() => {
        if (pieChartRef.current) {
          pieChartRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
        }
      }, 300)
    }
  }

  // Handle adding a new exporter field
  const handleAddExporter = () => {
    setExportingCountries([...exportingCountries, ''])
  }

  // Handle removing an exporter field
  const handleRemoveExporter = (index: number) => {
    if (exportingCountries.length > 1) {
      const newExporters = exportingCountries.filter((_, i) => i !== index)
      setExportingCountries(newExporters)
    }
  }

  // Handle updating an exporter at a specific index
  const handleExporterChange = (index: number, value: string) => {
    const newExporters = [...exportingCountries]
    newExporters[index] = value
    setExportingCountries(newExporters)
  }

  // Toggle comparison mode
  const handleToggleComparisonMode = (enabled: boolean) => {
    setIsComparisonMode(enabled)
    if (enabled) {
      // Initialize with one empty exporter field
      setExportingCountries([''])
      setSelectedExportingCountry('') // Clear single exporter
    } else {
      // Clear comparison data
      setExportingCountries([''])
      setComparisonResults(null)
      setExpandedComparisonCards(new Set())
    }
  }
  
  // Toggle individual comparison card expansion
  const toggleComparisonCard = (index: number) => {
    setExpandedComparisonCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  // Handle save calculation to history
  const handleSaveCalculation = async () => {
    // Check if there are calculated values to save
    if (tariffMode === 'manual') {
      if (!calculatedQuantity && !calculatedCost && !calculatedTariffRate) {
        alert('No calculation results to save. Please calculate first.')
        return
      }
    } else {
      if (!calculatedProduct && !calculatedImportingCountry && !calculatedExportingCountry && !calculatedQuantity && !calculatedCost && !calculatedDate) {
        alert('No calculation results to save. Please calculate first.')
        return
      }
    }

    // Create calculation data object
    const baseAmount = calculatedQuantity && calculatedCost ? (Number(calculatedQuantity) * Number(calculatedCost)) : 0
    
    // Calculate total tariffs
    const totalTariffs = calculatedQuantity && calculatedCost && tariffData.length > 0 ? 
      tariffData.reduce((sum, tariff) => {
        // Use the tariffService calculation method instead of the broken local one
        const result = tariffService.calculateTariffAmount(
          tariff.originalData, // Pass the original tariff object from API
          baseAmount,          // Pass the goods value
          Number(calculatedQuantity)   // Pass quantity so specific tariffs multiply per unit
        )
        return sum + result.tariffAmount
      }, 0) : 0
    
    // Calculate final amount with agreements
    let finalAmount = baseAmount + totalTariffs
    
    // Check if there's an override agreement
    const overrideAgreement = agreementsData.find(a => a.kind === 'override')
    
    if (overrideAgreement) {
      // Override: ignore tariffs, use only the override percentage
      finalAmount = baseAmount + (baseAmount * overrideAgreement.value)
    } else {
      // Apply surcharge and multiplier agreements
      let agreementAdjustments = 0
      agreementsData.forEach(agreement => {
        if (agreement.kind === 'surcharge') {
          // Surcharge: add percentage of base amount
          agreementAdjustments += baseAmount * agreement.value
        } else if (agreement.kind === 'multiplier') {
          // Multiplier: multiply tariffs
          agreementAdjustments += totalTariffs * (agreement.value - 1)
        }
      })
      finalAmount = baseAmount + totalTariffs + agreementAdjustments
    }

    const calculationData = {
      user_id: userProfile?.user_id || 'anonymous',
      product_type: calculatedProduct || 'Not specified',
      total_qty: calculatedQuantity || 0,
      base_cost: baseAmount,
      final_cost: finalAmount,
      import_country: calculatedImportingCountry || 'Not specified',
      export_country: calculatedExportingCountry || 'Not specified',
      tariff_lines: tariffData.length > 0 ? tariffData.map(tariff => {
        // Use the tariffService calculation method
        const result = tariffService.calculateTariffAmount(
          tariff.originalData, // Pass the original tariff object from API
          baseAmount,          // Pass the goods value
          Number(calculatedQuantity)   // Pass quantity so specific tariffs multiply per unit
        )
        return {
          description: tariff["Tariff Description"] || tariff["Tariff Type"],
          type: tariff["Tariff Type"],
          rate: tariff["Tariff amount"],
          amount: result.tariffAmount
        }
      }) : [],
      agreement_lines: agreementsData.length > 0 ? agreementsData.map(agreement => ({
        kind: agreement.kind,
        value_str: agreement.kind === 'multiplier' 
          ? `×${agreement.value}` 
          : `${(agreement.value * 100).toFixed(2)}%`,
        start_date: agreement.start_date,
        end_date: agreement.end_date,
        note: agreement.note || ''
      })) : []
    }

    try {
      // Save to history microservice
      const response = await saveCalculation(calculationData as any)
      
      // Also add to local state for immediate UI update
      const localHistoryEntry: CalculationData = {
        id: Date.now(),
        date: calculatedDate || new Date().toISOString().split('T')[0],
        timestamp: new Date().toLocaleString(),
        mode: tariffMode === 'manual' ? 'Manual Tariff' : 'Standard',
        productType: calculationData.product_type,
        importingCountry: calculationData.import_country,
        exportingCountry: calculationData.export_country,
        quantity: calculationData.total_qty,
        cost: calculatedCost || 0,
        tariffRate: calculatedTariffRate || 0,
        baseAmount: calculationData.base_cost.toFixed(2),
        tariffs: calculationData.tariff_lines.map((line: any) => ({
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


  // Load user's calculation history from the API (only basic info, no tariff lines)
  const loadUserHistory = async () => {
    const userId = userProfile?.user_id
    if (!userId || userId === 'anonymous') {
      return
    }

    setIsLoadingHistory(true)
    setHistoryError('')
    
    try {
      const response = await getUserHistory(userId)
      
      if (response.code === 200 && response.data) {
        // Transform API response - ONLY basic info for cards (lightweight)
        const transformedHistory = response.data.map((apiHistory: any) => ({
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
      } else {
        // No history found
        setCalculationHistory([])
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
  const loadDetailedTariffInfo = async (historyItem: any) => {
    setLoadingTariffDetails(true)
    setSelectedHistoryDetail(null)
    
    try {
      // Check if tariff details are already loaded and cached
      if (historyItem.tariffLinesLoaded && historyItem.tariffs) {
        setSelectedHistoryDetail({
          ...historyItem,
          tariffs: historyItem.tariffs
        })
        return
      }
      
      // Fetch tariff lines from the history microservice
      const tariffResponse = await getHistoryTariffLines(historyItem.id)
      
      if (tariffResponse.code === 200 && tariffResponse.data) {
        const tariffLines = tariffResponse.data.map((line: any) => ({
          type: line.tariff_type || 'N/A',
          description: line.tariff_desc || 'No description available',
          rate: line.rate_str || '0%',
          amount: line.amount_str || '$0.00'
        }))
        
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
  const restoreCalculationFromHistory = async (calculationData: CalculationData): Promise<void> => {
    try {
      // Load tariff lines if not already loaded
      if (!calculationData.tariffLinesLoaded && calculationData.id) {
        try {
          const tariffResponse = await getHistoryTariffLines(calculationData.id.toString())
          
          if (tariffResponse.code === 200 && tariffResponse.data) {
            const tariffLines = tariffResponse.data.map((line: any) => ({
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
          }
        } catch (error) {
          // Continue with restoration even if tariff details fail to load
        }
      }
      
      // Navigate to calculation page
      setCurrentPage('calculation')
      
      // Set tariff mode based on saved data
      const isManualMode = calculationData.mode === 'Manual Tariff'
      setTariffMode(isManualMode ? 'manual' : 'normal')
      
      // Populate input fields
      setQuantity(calculationData.quantity !== 'Not specified' ? String(calculationData.quantity) : '')
      setCost(calculationData.cost !== 'Not specified' ? String(calculationData.cost) : '')
      
      if (!isManualMode) {
        // Standard mode - populate all fields
        const productOption = calculationData.productType !== 'Not specified' ? 
          { value: calculationData.productType.toLowerCase().replace(/[^a-z0-9]/g, '-'), label: calculationData.productType } : 
          null
        setSelectedProduct(productOption)
        setSelectedImportingCountry(calculationData.importingCountry !== 'Not specified' ? calculationData.importingCountry : '')
        setSelectedExportingCountry(calculationData.exportingCountry !== 'Not specified' ? calculationData.exportingCountry : '')
        setDate(calculationData.date || calculationData.originalApiData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])
      } else {
        // Manual tariff mode - populate tariff rate
        setTariffRate(calculationData.tariffRate !== 'Not specified' ? String(calculationData.tariffRate || '') : '')
      }
      
      // Set calculated values
      setCalculatedProduct(calculationData.productType !== 'Not specified' ? calculationData.productType : '')
      setCalculatedImportingCountry(calculationData.importingCountry !== 'Not specified' ? calculationData.importingCountry : '')
      setCalculatedExportingCountry(calculationData.exportingCountry !== 'Not specified' ? calculationData.exportingCountry : '')
      setCalculatedQuantity(calculationData.quantity !== 'Not specified' ? String(calculationData.quantity) : '')
      setCalculatedCost(calculationData.cost !== 'Not specified' ? String(calculationData.cost) : '')
      setCalculatedDate(calculationData.date || calculationData.originalApiData?.created_at?.split('T')[0] || new Date().toISOString().split('T')[0])
      setCalculatedTariffRate(calculationData.tariffRate !== 'Not specified' ? String(calculationData.tariffRate || '') : '')
      
      // Restore tariff data if it exists (now loaded on-demand)
      if (calculationData.tariffs && calculationData.tariffs.length > 0) {
        const restoredTariffData = calculationData.tariffs.map(tariff => ({
          "Tariff Type": tariff.type,
          "Tariff Description": tariff.description,
          "Tariff amount": typeof tariff.rate === 'string' ? parseFloat(tariff.rate.replace(/[^0-9.-]/g, '')) || 0 : tariff.rate
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
    <div className="text-center py-8 px-4 max-w-[1800px] mx-auto">
      <h1 className="text-gray-800 mb-8 text-4xl font-bold">Trade Calculation</h1>
      
      {/* Three containers side by side */}
      <div className="flex flex-col lg:flex-row gap-6 mb-10 items-start">
        {/* First Container - Quantity and Cost */}
        <Card className="flex-1 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-blue-800">
              <span className="text-blue-600 mr-2">📊</span>
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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

          {/* Calculate Button */}
          <div className="mt-4">
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
                (tariffMode === 'manual' && !tariffRate) ||
                // For normal mode, require all fields and no validation errors
                (tariffMode === 'normal' && (
                  !selectedProduct || 
                  !selectedImportingCountry || 
                  // In comparison mode, require at least one exporter in the array
                  // In single mode, require selectedExportingCountry
                  (isComparisonMode ? exportingCountries.filter(e => e.trim() !== '').length === 0 : !selectedExportingCountry) ||
                  !date ||
                  dateValidationError !== '' || 
                  countryValidationError !== ''
                ))
              }
            >
              {isLoadingCountries ? 'Loading...' : 'Calculate'}
            </button>
          </div>
          </CardContent>
        </Card>

      {/* Second Container - Other Fields */}
      <Card className="flex-1 bg-purple-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg text-purple-800">
              <span className="text-purple-600 mr-2">⚙️</span>
              Tariff Configuration
            </CardTitle>
            {/* Tariff Mode Dropdown */}
            <div className="w-48">
              <Select value={tariffMode} onValueChange={handleTariffModeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">🔍 Normal (Lookup)</SelectItem>
                  <SelectItem value="manual">✏️ Manual Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {tariffMode === 'manual' ? (
          // Manual tariff mode - only show tariff rate field
          <div className="flex flex-col items-start text-left w-full">
            <label htmlFor="tariff-rate" className="font-medium mb-2">Tariff rate (%):</label>
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
            <p className="text-sm text-gray-500 mt-1">
              Enter the tariff rate percentage directly
            </p>
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
              <Popover open={importingCountryOpen} onOpenChange={setImportingCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={importingCountryOpen}
                    className="w-full justify-between"
                    disabled={isLoadingCountries}
                  >
                    {selectedImportingCountry
                      ? countries.find((country) => country.name === selectedImportingCountry)?.name
                      : (isLoadingCountries ? 'Loading countries...' : 'Select importing country...')}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {!isLoadingCountries && countries.map((country) => (
                          <CommandItem
                            key={country.id}
                            value={country.name}
                            onSelect={(currentValue) => {
                              handleImportingCountryChange(currentValue === selectedImportingCountry ? "" : currentValue)
                              setImportingCountryOpen(false)
                            }}
                          >
                            {country.name}
                            <Check
                              className={cn(
                                "ml-auto",
                                selectedImportingCountry === country.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Comparison Mode Toggle */}
            <div className="flex items-center gap-2 w-full my-2">
              <input
                type="checkbox"
                id="comparison-mode"
                checked={isComparisonMode}
                onChange={(e) => handleToggleComparisonMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="comparison-mode" className="text-sm font-medium cursor-pointer">
                Compare multiple exporters
              </label>
            </div>

            {/* Exporting Country Section - Conditional rendering based on comparison mode */}
            {!isComparisonMode ? (
              // Single exporter mode
              <div className="flex flex-col items-start text-left w-full">
                <label htmlFor="exporting-country">Exporting Country:</label>
                <Popover open={exportingCountryOpen} onOpenChange={setExportingCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={exportingCountryOpen}
                      className="w-full justify-between"
                      disabled={isLoadingCountries}
                    >
                      {selectedExportingCountry
                        ? countries.find((country) => country.name === selectedExportingCountry)?.name
                        : (isLoadingCountries ? 'Loading countries...' : 'Select exporting country...')}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search country..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {!isLoadingCountries && countries.map((country) => (
                            <CommandItem
                              key={country.id}
                              value={country.name}
                              onSelect={(currentValue) => {
                                handleExportingCountryChange(currentValue === selectedExportingCountry ? "" : currentValue)
                                setExportingCountryOpen(false)
                              }}
                            >
                              {country.name}
                              <Check
                                className={cn(
                                  "ml-auto",
                                  selectedExportingCountry === country.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            ) : (
              // Multiple exporters mode
              <div className="flex flex-col items-start text-left w-full gap-2">
                <label>Exporting Countries to Compare:</label>
                {exportingCountries.map((exporter, index) => (
                  <div key={index} className="flex items-center gap-2 w-full">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="flex-1 justify-between"
                          disabled={isLoadingCountries}
                        >
                          {exporter
                            ? countries.find((country) => country.name === exporter)?.name
                            : (isLoadingCountries ? 'Loading...' : `Select exporter ${index + 1}...`)}
                          <ChevronsUpDown className="opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search country..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                              {!isLoadingCountries && countries.map((country) => (
                                <CommandItem
                                  key={country.id}
                                  value={country.name}
                                  onSelect={(currentValue) => {
                                    handleExporterChange(index, currentValue)
                                  }}
                                >
                                  {country.name}
                                  <Check
                                    className={cn(
                                      "ml-auto",
                                      exporter === country.name ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    
                    {/* Remove button - only show if more than 1 exporter */}
                    {exportingCountries.length > 1 && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleRemoveExporter(index)}
                        className="h-10 w-10 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                ))}
                
                {/* Add exporter button */}
                <Button
                  variant="outline"
                  onClick={handleAddExporter}
                  className="w-full border-dashed border-2 hover:border-blue-500 hover:bg-blue-50"
                >
                  + Add Another Exporter
                </Button>
              </div>
            )}
            
            {/* Country validation error message */}
            {countryValidationError && (
              <div className="text-red-500 text-sm mt-1 mb-2">
                ⚠️ {countryValidationError}
              </div>
            )}

            <div className="flex flex-col items-start text-left w-full">
              <label htmlFor="calculation-date">Date:</label>
              <input
                type="date"
                id="calculation-date"
                value={date}
                onChange={handleDateChange}
                className="w-full p-3 text-base border-2 border-gray-300 rounded-lg bg-white text-gray-900 transition-colors hover:border-blue-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.showPicker) target.showPicker();
                }}
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
        </CardContent>
      </Card>
      </div>

      {/* Loading indicator for comparison */}
      {isLoadingComparison && (
        <Card className="mb-6 bg-gray-50 border-gray-300">
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-lg text-gray-700">Comparing exporters...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unified Results Container - For Both Single and Multiple Exporters */}
      {/* Show for comparison mode when we have results */}
      {comparisonResults && comparisonResults.length > 0 && (
        <div className="mt-6" ref={pieChartRef}>
          <h2 className="text-2xl font-bold text-center mb-4 text-blue-900">
            🏆 Exporter Leaderboard - Ranked by Cost
          </h2>
          
          {/* Summary statistics */}
          <div className="mb-4 p-4 bg-blue-100 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Comparison Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="font-medium">Best Option:</span> {comparisonResults[0].exporterCountry}
              </div>
              <div>
                <span className="font-medium">Savings vs Worst:</span> $
                {(comparisonResults[comparisonResults.length - 1].finalTotal - comparisonResults[0].finalTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div>
                <span className="font-medium">Options Compared:</span> {comparisonResults.length}
              </div>
            </div>
          </div>

          {/* Leaderboard Cards */}
          <div className="space-y-4">
            {comparisonResults.map((result, index) => {
              const isExpanded = expandedComparisonCards.has(index)
              const rank = index + 1
              const isWinner = rank === 1
              
              return (
                <div key={index} className="w-full">
                  {/* Summary Row */}
                  <div 
                    className={`bg-gradient-to-r ${isWinner ? 'from-yellow-50 to-amber-50 border-yellow-400 shadow-lg' : 'from-blue-50 to-purple-50 border-blue-300'} p-4 rounded-lg border-2 shadow-md cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-300`}
                    onClick={() => toggleComparisonCard(index)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        {/* Rank */}
                        <div className="text-center min-w-[60px]">
                          <div className="text-xs text-gray-600 font-semibold">Rank</div>
                          <div className={`text-2xl font-bold ${isWinner ? 'text-yellow-600' : 'text-gray-800'}`}>
                            {isWinner ? '🏆' : rank}
                          </div>
                        </div>
                        
                        {/* From → To */}
                        <div className="text-center">
                          <div className="text-xs text-gray-600 font-semibold">From → To</div>
                          <div className="text-sm font-bold text-gray-800">
                            {result.exporterCountry} → {calculatedImportingCountry}
                          </div>
                        </div>
                        
                        {/* Product */}
                        <div className="text-center">
                          <div className="text-xs text-gray-600 font-semibold">Product</div>
                          <div className="text-sm font-bold text-gray-800">{calculatedProduct}</div>
                        </div>
                        
                        {/* Base Cost */}
                        <div className="text-center">
                          <div className="text-xs text-gray-600 font-semibold">Base Cost</div>
                          <div className="text-sm font-bold text-gray-800">
                            ${result.baseCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        
                        {/* Tariffs Count */}
                        <div className="text-center">
                          <div className="text-xs text-gray-600 font-semibold">Tariffs</div>
                          <div className="text-sm font-bold text-blue-600">{result.tariffs.length}</div>
                        </div>
                        
                        {/* Agreements Count */}
                        <div className="text-center">
                          <div className="text-xs text-gray-600 font-semibold">Agreements</div>
                          <div className="text-sm font-bold text-purple-600">{result.agreements.length}</div>
                        </div>
                        
                        {/* Final Total */}
                        <div className="text-center">
                          <div className="text-xs text-gray-600 font-semibold">Final Total</div>
                          <div className={`text-lg font-bold ${isWinner ? 'text-green-700' : 'text-green-600'}`}>
                            ${result.finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                      
                      {/* Expand/Collapse Arrow */}
                      <div className="text-2xl text-blue-600">
                        {isExpanded ? '▲' : '▼'}
                      </div>
                    </div>
                    <div className="text-center mt-2 text-xs text-gray-500 italic">
                      Click to {isExpanded ? 'hide' : 'view'} detailed breakdown
                    </div>
                  </div>

                  {/* Detailed Card (hidden by default) */}
                  {isExpanded && (
                    <div className="mt-2 bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-lg border-2 border-purple-200 shadow-xl">
                      <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center justify-center">
                        <span className="text-purple-600 mr-3 text-3xl">📊</span>
                        Cost Breakdown & Calculation Results - {result.exporterCountry}
                      </h3>

                      {/* Two-column layout: Pie chart on left, details on right */}
                      <div className="flex flex-col lg:flex-row gap-6 mb-8">
                        {/* Left Column: Pie Chart */}
                        <div className="lg:w-1/2 flex items-start justify-center">
                          {(result.tariffs.length > 0 || result.agreements.length > 0) && (
                            <CostBreakdownPieChart
                              baseCost={result.baseCost}
                              quantity={Number(calculatedQuantity)}
                              tariffData={result.tariffs}
                              agreementsData={result.agreements}
                              importerCountry={calculatedImportingCountry}
                              exporterCountry={result.exporterCountry}
                            />
                          )}
                        </div>

                        {/* Right Column: Calculation Details */}
                        <div className="lg:w-1/2 text-left text-sm">
                          {/* Applied Agreements Summary Table */}
                          {result.agreements.length > 0 && (
                            <div className="mb-4">
                              <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                                <span className="text-purple-500 mr-1">📋</span>
                                Applied Agreements
                              </div>
                              <div className="bg-purple-50 rounded-lg border border-purple-200 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-purple-100">
                                    <tr>
                                      <th className="text-left p-2 font-semibold text-purple-800">Description</th>
                                      <th className="text-left p-2 font-semibold text-purple-800">Type</th>
                                      <th className="text-left p-2 font-semibold text-purple-800">Rate</th>
                                      <th className="text-left p-2 font-semibold text-purple-800">Start Date</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {result.agreements.map((agreement, agIdx) => (
                                      <tr key={agIdx} className={agIdx % 2 === 0 ? 'bg-white' : 'bg-purple-25'}>
                                        <td className="p-2 text-gray-600">
                                          {agreement.note || 'No note provided'}
                                        </td>
                                        <td className="p-2 capitalize">
                                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                            agreement.kind === 'override' ? 'bg-blue-100 text-blue-700' :
                                            agreement.kind === 'surcharge' ? 'bg-red-100 text-red-700' :
                                            'bg-green-100 text-green-700'
                                          }`}>
                                            {agreement.kind}
                                          </span>
                                        </td>
                                        <td className="p-2 font-semibold text-gray-700">
                                          {agreement.kind === 'multiplier' 
                                            ? `×${agreement.value}` 
                                            : `${(agreement.value * 100).toFixed(2)}%`
                                          }
                                        </td>
                                        <td className="p-2 text-gray-600">
                                          {new Date(agreement.start_date).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'short', 
                                            day: 'numeric' 
                                          })}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Applied Tariffs Summary Table */}
                          {result.tariffs.length > 0 && (
                            <div className="mb-4">
                              <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                                <span className="text-blue-500 mr-1">📊</span>
                                Applied Tariffs
                              </div>
                              <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead className="bg-blue-100">
                                    <tr>
                                      <th className="text-left p-2 font-semibold text-blue-800">Description</th>
                                      <th className="text-left p-2 font-semibold text-blue-800">Type</th>
                                      <th className="text-left p-2 font-semibold text-blue-800">Rate</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {result.tariffs.map((tariff, tIdx) => (
                                      <tr key={tIdx} className={tIdx % 2 === 0 ? 'bg-white' : 'bg-blue-25'}>
                                        <td className="p-2 text-gray-700">
                                          {tariff["Tariff Description"]}
                                        </td>
                                        <td className="p-2 capitalize">
                                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                            tariff["Tariff Type"].toLowerCase() === 'ad_valorem' ? 'bg-green-100 text-green-700' :
                                            tariff["Tariff Type"].toLowerCase() === 'specific' ? 'bg-orange-100 text-orange-700' :
                                            'bg-purple-100 text-purple-700'
                                          }`}>
                                            {tariff["Tariff Type"]}
                                          </span>
                                        </td>
                                        <td className="p-2 font-semibold text-gray-700">
                                          {tariff["Tariff Type"].toLowerCase() === 'specific' 
                                            ? `$${Number(tariff["Tariff amount"]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per unit`
                                            : `${tariff["Tariff amount"]}%`
                                          }
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* Base Cost */}
                          <div className="mb-4">
                            <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                              <span className="text-green-500 mr-1">🧮</span>
                              Base Cost
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div className="flex items-center justify-between text-xs">
                                <span>
                                  <span className="text-blue-600 font-semibold">{Number(calculatedQuantity).toLocaleString()}</span>
                                  <span className="text-gray-500 mx-1">×</span>
                                  <span className="text-green-600 font-semibold">${Number(calculatedCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </span>
                                <span className="text-red-600 font-bold">${result.baseCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>

                          {/* Tariff Calculations */}
                          {result.tariffs.length > 0 && (
                            <div className="mb-4">
                              <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                                <span className="text-purple-500 mr-1">💰</span>
                                {result.hasOverride ? 'Tariffs (Overridden by Agreement)' : 'Tariffs'}
                              </div>
                              <div className="space-y-2">
                                {result.tariffs.map((tariff, tIdx) => {
                                  // Use tariffService for proper calculation
                                  const calcResult = tariffService.calculateTariffAmount(
                                    tariff.originalData,
                                    result.baseCost,
                                    Number(calculatedQuantity)
                                  )
                                  const tariffAmount = calcResult.tariffAmount
                                  
                                  return (
                                    <div key={tIdx} className={`p-2 rounded border ${
                                      result.hasOverride 
                                        ? 'bg-gray-100 border-gray-300 opacity-50' 
                                        : 'bg-purple-50 border-purple-200'
                                    }`}>
                                      <div className={`font-semibold text-xs mb-1 ${
                                        result.hasOverride ? 'text-gray-500 line-through' : 'text-purple-700'
                                      }`}>
                                        {tariff["Tariff Description"]}
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className={result.hasOverride ? 'text-gray-500' : 'text-gray-600'}>
                                          ({tariff["Tariff Type"]}, {tariff["Tariff Type"].toLowerCase() === 'specific' ? `$${Number(tariff["Tariff amount"]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per unit` : `${tariff["Tariff amount"]}%`})
                                        </span>
                                        <span className={`font-bold ${
                                          result.hasOverride ? 'text-gray-500 line-through' : 'text-red-600'
                                        }`}>
                                          ${tariffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Agreement Adjustments */}
                          {result.agreements.length > 0 && (
                            <div className="mb-4">
                              <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                                <span className="text-purple-500 mr-1">📝</span>
                                Agreement Adjustments
                              </div>
                              <div className="space-y-2">
                                {result.agreements.map((agreement, agIdx) => {
                                  let adjustmentAmount = 0
                                  let description = ''
                                  
                                  if (agreement.kind === 'override') {
                                    adjustmentAmount = result.baseCost * agreement.value
                                    description = `Override tariff at ${(agreement.value * 100).toFixed(2)}%`
                                  } else if (agreement.kind === 'surcharge') {
                                    adjustmentAmount = result.baseCost * agreement.value
                                    description = `Additional surcharge of ${(agreement.value * 100).toFixed(2)}%`
                                  } else if (agreement.kind === 'multiplier') {
                                    adjustmentAmount = result.totalTariffAmount * (agreement.value - 1)
                                    description = `Multiply tariffs by ${agreement.value}×`
                                  }
                                  
                                  return (
                                    <div key={agIdx} className="bg-indigo-50 p-2 rounded border border-indigo-200">
                                      <div className="font-semibold text-indigo-700 text-xs mb-1">
                                        {description}
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-600">({agreement.kind})</span>
                                        <span className="text-indigo-600 font-bold">
                                          ${adjustmentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Total Amount */}
                          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border-2 border-green-300 mt-3">
                            <div className="text-sm font-bold text-gray-800 mb-1 flex items-center">
                              <span className="text-green-500 mr-1">🎯</span>
                              Total Amount
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-700">
                                Base + {(() => {
                                  if (result.hasOverride) return 'Agreement'
                                  if (result.agreements.length > 0 && result.tariffs.length > 0) return 'Tariffs + Agreements'
                                  if (result.tariffs.length > 0) return 'Tariffs'
                                  if (result.agreements.length > 0) return 'Agreements'
                                  return 'No Adjustments'
                                })()} = 
                              </span>
                              <span className="text-green-600 font-bold text-lg">
                                ${result.finalTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Show for single calculation mode when we have results */}
      {!isComparisonMode && calculatedQuantity && calculatedCost && (
        <>
          {/* Summary Row (appears first, always visible) */}
          <div 
            className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2 border-blue-300 shadow-md cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-300"
            onClick={() => setShowDetailedCard(!showDetailedCard)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 flex-1">
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-semibold">From → To</div>
                  <div className="text-sm font-bold text-gray-800">
                    {calculatedExportingCountry} → {calculatedImportingCountry}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-semibold">Product</div>
                  <div className="text-sm font-bold text-gray-800">{calculatedProduct}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-semibold">Base Cost</div>
                  <div className="text-sm font-bold text-gray-800">
                    ${(Number(calculatedQuantity) * Number(calculatedCost)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-semibold">Tariffs</div>
                  <div className="text-sm font-bold text-blue-600">{tariffData.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-semibold">Agreements</div>
                  <div className="text-sm font-bold text-purple-600">{agreementsData.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 font-semibold">Final Total</div>
                  <div className="text-lg font-bold text-green-700">
                    ${(() => {
                      const baseCost = Number(calculatedQuantity) * Number(calculatedCost)
                      
                      // Check if there's an override agreement
                      const overrideAgreement = agreementsData.find(a => a.kind === 'override')
                      
                      if (overrideAgreement) {
                        const overrideAmount = baseCost * overrideAgreement.value
                        return (baseCost + overrideAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      }
                      
                      // Calculate total tariffs
                      const totalTariffs = tariffData.reduce((sum, tariff) => {
                        const result = tariffService.calculateTariffAmount(
                          tariff.originalData,
                          baseCost,
                          Number(calculatedQuantity)
                        )
                        return sum + result.tariffAmount
                      }, 0)
                      
                      // Apply other agreement types
                      let agreementAdjustments = 0
                      agreementsData.forEach(agreement => {
                        if (agreement.kind === 'surcharge') {
                          agreementAdjustments += baseCost * agreement.value
                        } else if (agreement.kind === 'multiplier') {
                          agreementAdjustments += totalTariffs * (agreement.value - 1)
                        }
                      })
                      
                      return (baseCost + totalTariffs + agreementAdjustments).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    })()}
                  </div>
                </div>
              </div>
              <div className="text-2xl text-blue-600">
                {showDetailedCard ? '▲' : '▼'}
              </div>
            </div>
            <div className="text-center mt-2 text-xs text-gray-500 italic">
              Click to {showDetailedCard ? 'hide' : 'view'} detailed breakdown
            </div>
          </div>

          {/* Detailed Card (hidden by default, shows when summary row is clicked) */}
          {showDetailedCard && (
            <div 
              ref={pieChartRef}
              className="mt-4 bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-lg border-2 border-purple-200 shadow-xl"
            >
              <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center justify-center">
                <span className="text-purple-600 mr-3 text-3xl">📊</span>
                Cost Breakdown & Calculation Results
              </h3>

          {/* Show skeleton loading while data is being fetched */}
          {(isLoadingTariffs || isLoadingAgreements) ? (
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              {/* Left Column: Pie Chart Skeleton */}
              <div className="lg:w-1/2 flex items-start justify-center">
                <div className="w-full max-w-md space-y-4">
                  <Skeleton className="h-[400px] w-full rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-3 w-1/2 mx-auto" />
                  </div>
                </div>
              </div>

              {/* Right Column: Details Skeleton */}
              <div className="lg:w-1/2 space-y-6">
                {/* Agreements table skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
                
                {/* Tariffs table skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
                
                {/* Base cost skeleton */}
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
                
                {/* Buttons skeleton */}
                <div className="space-y-2 pt-3">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
          ) : (
            /* Two-column layout: Pie chart on left, details on right */
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
              {/* Left Column: Pie Chart */}
              <div className="lg:w-1/2 flex items-start justify-center">
              {(tariffData.length > 0 || agreementsData.length > 0) && (
                <CostBreakdownPieChart
                  baseCost={Number(calculatedQuantity) * Number(calculatedCost)}
                  quantity={Number(calculatedQuantity)}
                  tariffData={tariffData}
                  agreementsData={agreementsData}
                  importerCountry={calculatedImportingCountry}
                  exporterCountry={calculatedExportingCountry}
                />
              )}
            </div>

            {/* Right Column: Calculation Details */}
            <div className="lg:w-1/2 text-left text-sm">

            {/* Applied Agreements Summary Table */}
            {agreementsData.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <span className="text-purple-500 mr-1">📋</span>
                  Applied Agreements
                </div>
                <div className="bg-purple-50 rounded-lg border border-purple-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-purple-100">
                      <tr>
                        <th className="text-left p-2 font-semibold text-purple-800">Description</th>
                        <th className="text-left p-2 font-semibold text-purple-800">Type</th>
                        <th className="text-left p-2 font-semibold text-purple-800">Rate</th>
                        <th className="text-left p-2 font-semibold text-purple-800">Start Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agreementsData.map((agreement, index) => (
                        <tr key={agreement.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-purple-25'}>
                          <td className="p-2 text-gray-600">
                            {agreement.note || 'No note provided'}
                          </td>
                          <td className="p-2 capitalize">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              agreement.kind === 'override' ? 'bg-blue-100 text-blue-700' :
                              agreement.kind === 'surcharge' ? 'bg-red-100 text-red-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {agreement.kind}
                            </span>
                          </td>
                          <td className="p-2 font-semibold text-gray-700">
                            {agreement.kind === 'multiplier' 
                              ? `×${agreement.value}` 
                              : `${(agreement.value * 100).toFixed(2)}%`
                            }
                          </td>
                          <td className="p-2 text-gray-600">
                            {new Date(agreement.start_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Applied Tariffs Summary Table */}
            {tariffData.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <span className="text-blue-500 mr-1">📊</span>
                  Applied Tariffs
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-blue-100">
                      <tr>
                        <th className="text-left p-2 font-semibold text-blue-800">Description</th>
                        <th className="text-left p-2 font-semibold text-blue-800">Type</th>
                        <th className="text-left p-2 font-semibold text-blue-800">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tariffData.map((tariff, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-25'}>
                          <td className="p-2 text-gray-700">
                            {tariff["Tariff Description"]}
                          </td>
                          <td className="p-2 capitalize">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              tariff["Tariff Type"].toLowerCase() === 'ad_valorem' ? 'bg-green-100 text-green-700' :
                              tariff["Tariff Type"].toLowerCase() === 'specific' ? 'bg-orange-100 text-orange-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {tariff["Tariff Type"]}
                            </span>
                          </td>
                          <td className="p-2 font-semibold text-gray-700">
                            {tariff["Tariff Type"].toLowerCase() === 'specific' 
                              ? `$${Number(tariff["Tariff amount"]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per unit`
                              : `${tariff["Tariff amount"]}%`
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                  {(() => {
                    // Check if there's an override agreement
                    const hasOverride = agreementsData.some(a => a.kind === 'override')
                    return hasOverride ? 'Tariffs (Overridden by Agreement)' : 'Tariffs'
                  })()}
                </div>
                <div className="space-y-2">
                  {tariffData.map((tariff, index) => {
                    const baseAmount = Number(calculatedQuantity) * Number(calculatedCost)
                    // Check if tariffs are overridden by agreement
                    const hasOverride = agreementsData.some(a => a.kind === 'override')
                    
                    // Use tariffService for proper calculation
                    const result = tariffService.calculateTariffAmount(
                      tariff.originalData, // Pass the original tariff object from API
                      baseAmount,          // Pass the goods value
                      Number(calculatedQuantity)   // quantity for specific tariffs
                    )
                    const tariffAmount = result.tariffAmount
                    
                    return (
                      <div key={index} className={`p-2 rounded border ${
                        hasOverride 
                          ? 'bg-gray-100 border-gray-300 opacity-50' 
                          : 'bg-purple-50 border-purple-200'
                      }`}>
                        <div className={`font-semibold text-xs mb-1 ${
                          hasOverride ? 'text-gray-500 line-through' : 'text-purple-700'
                        }`}>
                          {tariff["Tariff Description"]}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className={hasOverride ? 'text-gray-500' : 'text-gray-600'}>
                            ({tariff["Tariff Type"]}, {tariff["Tariff Type"].toLowerCase() === 'specific' ? `$${Number(tariff["Tariff amount"]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per unit` : `${tariff["Tariff amount"]}%`})
                          </span>
                          <span className={`font-bold ${
                            hasOverride ? 'text-gray-500 line-through' : 'text-red-600'
                          }`}>
                            ${tariffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
                
            {/* Agreement Adjustments - show when there are agreements */}
            {agreementsData.length > 0 && calculatedQuantity && calculatedCost && (
              <div className="mb-4">
                <div className="text-sm font-bold text-gray-800 mb-2 flex items-center">
                  <span className="text-purple-500 mr-1">📝</span>
                  Agreement Adjustments
                </div>
                <div className="space-y-2">{agreementsData.map((agreement, index) => {
                      const baseAmount = Number(calculatedQuantity) * Number(calculatedCost)
                      let adjustmentAmount = 0
                      let description = ''
                      
                      if (agreement.kind === 'override') {
                        // Override: use agreement value instead of tariffs
                        adjustmentAmount = baseAmount * agreement.value
                        description = `Override tariff at ${(agreement.value * 100).toFixed(2)}%`
                      } else if (agreement.kind === 'surcharge') {
                        // Surcharge: add to existing tariffs
                        adjustmentAmount = baseAmount * agreement.value
                        description = `Additional surcharge of ${(agreement.value * 100).toFixed(2)}%`
                      } else if (agreement.kind === 'multiplier') {
                        // Multiplier: multiply existing tariffs
                        const totalTariffs = tariffData.reduce((sum, tariff) => {
                          const result = tariffService.calculateTariffAmount(
                            tariff.originalData,
                            baseAmount,
                            Number(calculatedQuantity)
                          )
                          return sum + result.tariffAmount
                        }, 0)
                        adjustmentAmount = totalTariffs * (agreement.value - 1)
                        description = `Multiply tariffs by ${agreement.value}×`
                      }
                      
                      return (
                        <div key={index} className="bg-indigo-50 p-2 rounded border border-indigo-200">
                          <div className="font-semibold text-indigo-700 text-xs mb-1">
                            {description}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              ({agreement.kind})
                            </span>
                            <span className="text-indigo-600 font-bold">
                              ${adjustmentAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
                
            {/* Base Cost and Total Amount - always show when calculation is done */}
            {calculatedQuantity && calculatedCost && (
              <div>
                {/* Total with all tariffs and agreements */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-3 rounded-lg border-2 border-green-300 mt-3">
                  <div className="text-sm font-bold text-gray-800 mb-1 flex items-center">
                    <span className="text-green-500 mr-1">🎯</span>
                    Total Amount
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">
                      Base + {(() => {
                        const hasOverride = agreementsData.some(a => a.kind === 'override')
                        if (hasOverride) return 'Agreement'
                        if (agreementsData.length > 0 && tariffData.length > 0) return 'Tariffs + Agreements'
                        if (tariffData.length > 0) return 'Tariffs'
                        if (agreementsData.length > 0) return 'Agreements'
                        return 'No Adjustments'
                      })()} = 
                    </span>
                    <span className="text-green-600 font-bold text-lg">
                      ${(() => {
                        const baseAmount = Number(calculatedQuantity) * Number(calculatedCost)
                        
                        // Check if there's an override agreement
                        const overrideAgreement = agreementsData.find(a => a.kind === 'override')
                        
                        if (overrideAgreement) {
                          // If override exists, ignore all tariffs and use only the override
                          const overrideAmount = baseAmount * overrideAgreement.value
                          return (baseAmount + overrideAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        }
                        
                        // Calculate total tariffs
                        const totalTariffs = tariffData.reduce((sum, tariff) => {
                          const result = tariffService.calculateTariffAmount(
                            tariff.originalData,
                            baseAmount,
                            Number(calculatedQuantity)
                          )
                          return sum + result.tariffAmount
                        }, 0)
                        
                        // Apply other agreement types
                        let agreementAdjustments = 0
                        agreementsData.forEach(agreement => {
                          if (agreement.kind === 'surcharge') {
                            // Surcharge: add percentage of base amount
                            agreementAdjustments += baseAmount * agreement.value
                          } else if (agreement.kind === 'multiplier') {
                            // Multiplier: multiply tariffs
                            agreementAdjustments += totalTariffs * (agreement.value - 1)
                          }
                        })
                        
                        return (baseAmount + totalTariffs + agreementAdjustments).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
                  (tariffMode === 'manual' && !calculatedTariffRate) ||
                  // For standard mode, need basic calculation done
                  (tariffMode === 'normal' && (!calculatedProduct || !calculatedImportingCountry || !calculatedExportingCountry))
                }
              >
                Save Calculation
              </button>
              
              {/* Predict Future Tariff Button - only show after calculation */}
              {calculatedProduct && calculatedImportingCountry && calculatedExportingCountry && (
                <button 
                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-white font-bold py-2 px-4 text-sm rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:shadow-none"
                  onClick={handlePredictCalculation}
                  disabled={isLoadingPrediction || !calculatedProduct}
                >
                  {isLoadingPrediction ? '🔄 Predicting...' : '🔮 Predict Future Tariff'}
                </button>
              )}
            </div>
            </div>
            </div>
          )}
        </div>
      )}
      
      {/* Predicted Results Section - Show after prediction */}
      {predictedResults && (
        <div className="mb-8" id="predicted-results">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-lg">
            <CardHeader>
              <h3 className="text-2xl font-bold text-blue-900 mb-2 flex items-center justify-center">
                <span className="text-blue-600 mr-3 text-3xl">🔮</span>
                Predicted Future Tariff Results
              </h3>
              <p className="text-sm text-blue-700 text-center">
                Based on ML forecast for {predictedResults.importingCountry} importing from {predictedResults.exportingCountry}
              </p>
            </CardHeader>
            <CardContent>
              {predictionError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800 font-medium">❌ Prediction Error</p>
                  <p className="text-sm text-red-600">{predictionError}</p>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Column: Pie Chart */}
                  <div className="lg:w-1/2 flex items-start justify-center">
                    <CostBreakdownPieChart
                      baseCost={predictedResults.totalCost}
                      quantity={Number(predictedResults.quantity)}
                      tariffData={predictedResults.tariffData}
                      agreementsData={predictedResults.agreements}
                      importerCountry={predictedResults.importingCountry}
                      exporterCountry={predictedResults.exportingCountry}
                    />
                  </div>

                  {/* Right Column: Details */}
                  <div className="lg:w-1/2 space-y-4">
                    {/* Predicted Tariff Rate Card */}
                    <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-1">Predicted Tariff Rate (Ad Valorem)</p>
                      <p className="text-3xl font-bold text-blue-900">{predictedResults.tariffRate}%</p>
                      <p className="text-xs text-blue-600 mt-1">ML-forecasted rate for future trade</p>
                    </div>

                    {/* Agreements Table */}
                    {predictedResults.agreements && predictedResults.agreements.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                          <span className="text-blue-600 mr-2">🤝</span>
                          Active Agreements
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-blue-200">
                          <table className="min-w-full bg-white">
                            <thead className="bg-blue-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-800">Description</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-800">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-800">Value</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-800">Start Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {predictedResults.agreements.map((agreement: Agreement, index: number) => (
                                <tr key={index} className="border-t border-blue-100">
                                  <td className="px-4 py-2 text-sm text-gray-700">{agreement.note || 'No note'}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                      agreement.kind === 'override' ? 'bg-blue-100 text-blue-700' :
                                      agreement.kind === 'surcharge' ? 'bg-red-100 text-red-700' :
                                      'bg-green-100 text-green-700'
                                    }`}>
                                      {agreement.kind}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm font-semibold text-gray-700">
                                    {agreement.kind === 'multiplier' 
                                      ? `×${agreement.value}` 
                                      : `${(agreement.value * 100).toFixed(2)}%`
                                    }
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{agreement.start_date}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Tariff Lines Table */}
                    {predictedResults.tariffData && predictedResults.tariffData.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                          <span className="text-blue-600 mr-2">📋</span>
                          Tariff Information
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-blue-200">
                          <table className="min-w-full bg-white">
                            <thead className="bg-blue-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-800">HS Code</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-blue-800">Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {predictedResults.tariffData.slice(0, 3).map((tariff: TariffData, index: number) => (
                                <tr key={index} className="border-t border-blue-100">
                                  <td className="px-4 py-2 text-sm font-mono text-gray-700">{tariff.hscode}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{tariff.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Cost Breakdown */}
                    <div className="bg-white border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-3">Cost Breakdown (Predicted)</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Base Cost ({predictedResults.quantity} units):</span>
                          <span className="font-semibold text-gray-800">${predictedResults.totalCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Predicted Tariff ({predictedResults.tariffRate}%):</span>
                          <span className="font-semibold text-blue-700">${predictedResults.tariffCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
                          <span className="text-blue-900">Total Predicted Cost:</span>
                          <span className="text-blue-600">${predictedResults.totalWithTariff.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Comparison with Current Calculation */}
                    {calculatedQuantity && calculatedCost && (
                      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                        <h4 className="font-semibold text-amber-900 mb-2">📊 Comparison</h4>
                        <p className="text-sm text-amber-800">
                          <strong>Current rate vs. Predicted rate:</strong><br/>
                          {calculatedTariffRate && parseFloat(calculatedTariffRate) !== parseFloat(predictedResults.tariffRate) ? (
                            <>
                              Current: {calculatedTariffRate}% → Predicted: {predictedResults.tariffRate}%<br/>
                              {parseFloat(predictedResults.tariffRate) > parseFloat(calculatedTariffRate) ? (
                                <span className="text-red-600">⚠️ Predicted tariff is higher by {(parseFloat(predictedResults.tariffRate) - parseFloat(calculatedTariffRate)).toFixed(2)}%</span>
                              ) : (
                                <span className="text-green-600">✓ Predicted tariff is lower by {(parseFloat(calculatedTariffRate) - parseFloat(predictedResults.tariffRate)).toFixed(2)}%</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-600">No current tariff rate to compare</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </>
    )}
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
            {/* Management button - only show if onManagementClick prop is provided (admin mode) */}
            {onManagementClick && (
              <button 
                className={`${showManagement ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-transparent text-gray-300 hover:bg-slate-600 hover:text-gray-100'} border-none py-3 px-6 text-base cursor-pointer rounded-md transition-all duration-300 font-medium`}
                onClick={onManagementClick}
              >
                Management
              </button>
            )}
            <button 
              className={`${currentPage === 'calculation' && !showManagement ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-transparent text-gray-300 hover:bg-slate-600 hover:text-gray-100'} border-none py-3 px-6 text-base cursor-pointer rounded-md transition-all duration-300 font-medium`}
              onClick={() => {
                showCalculation()
                if (onCalculationClick) onCalculationClick()
              }}
            >
              Calculation
            </button>
            <button 
              className={`${currentPage === 'history' && !showManagement ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-transparent text-gray-300 hover:bg-slate-600 hover:text-gray-100'} border-none py-3 px-6 text-base cursor-pointer rounded-md transition-all duration-300 font-medium`}
              onClick={() => {
                showHistory()
                if (onHistoryClick) onHistoryClick()
              }}
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
        {showManagement && managementContent ? managementContent : (currentPage === 'calculation' ? renderCalculationPage() : renderHistoryPage())}
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
                    <p><strong>Date:</strong> {selectedHistoryDetail.originalApiData?.created_at ? new Date(selectedHistoryDetail.originalApiData.created_at).toLocaleDateString() : 'N/A'}</p>
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
