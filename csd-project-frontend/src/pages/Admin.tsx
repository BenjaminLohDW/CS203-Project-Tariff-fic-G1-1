import { useState, useEffect } from 'react'
import App from '../App'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../components/ui/Table'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/Popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '../lib/utils'
import adminTariffService, { TariffCreateRequest, TariffResponse } from '../lib/adminTariffService'
import adminAgreementService, { AgreementCreateRequest, AgreementResponse } from '../lib/adminAgreementService'
import adminCountryService, { Country } from '../lib/adminCountryService'
import { CsvBulkUpload } from '../components/CsvBulkUpload'

function Admin() {
  // State for page navigation
  const [showManagement, setShowManagement] = useState<boolean>(false)
  // State for management tab selection
  const [managementTab, setManagementTab] = useState<'tariffs' | 'agreements' | 'countries'>('tariffs')
  
  // Tariff state
  const [tariffs, setTariffs] = useState<TariffResponse[]>([])
  const [loadingTariffs, setLoadingTariffs] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10) // Show 10 tariffs per page
  const [tariffSearchQuery, setTariffSearchQuery] = useState('')
  const [tariffForm, setTariffForm] = useState<TariffCreateRequest>({
    hsCode: '',
    importerId: '',
    exporterId: '',
    tariffType: 'Ad Valorem',
    tariffRate: 0,
    specificAmt: null,
    specificUnit: null,
    minTariffAmt: null,
    maxTariffAmt: null,
    startDate: '',
    endDate: '',
  })
  
  // Agreement state
  const [agreements, setAgreements] = useState<AgreementResponse[]>([])
  const [loadingAgreements, setLoadingAgreements] = useState(false)
  const [agreementPage, setAgreementPage] = useState(1)
  const [agreementSearchQuery, setAgreementSearchQuery] = useState('')
  const [agreementForm, setAgreementForm] = useState<AgreementCreateRequest>({
    importerName: '',
    exporterName: '',
    start_date: '',
    end_date: '',
    kind: 'override',
    value: 0,
    note: '',
  })
  
  // Country state
  const [countries, setCountries] = useState<Country[]>([])
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [countryPage, setCountryPage] = useState(1)
  const [countrySearchQuery, setCountrySearchQuery] = useState('')
  
  // Popover state for country dropdowns in Agreement form
  const [importerCountryOpen, setImporterCountryOpen] = useState(false)
  const [exporterCountryOpen, setExporterCountryOpen] = useState(false)

  // Load data when tab changes
  useEffect(() => {
    if (showManagement && managementTab === 'tariffs') {
      loadTariffs()
    } else if (showManagement && managementTab === 'agreements') {
      loadAgreements()
      loadCountries() // Load countries for dropdowns
    } else if (showManagement && managementTab === 'countries') {
      loadCountries()
    }
  }, [showManagement, managementTab])

  // Load Tariffs
  const loadTariffs = async () => {
    console.log('🔄 Loading tariffs...')
    setLoadingTariffs(true)
    try {
      const data = await adminTariffService.getAllTariffs()
      console.log('✅ Tariffs loaded:', data)
      console.log('📊 Number of tariffs:', data.length)
      // Sort by ID in ascending order
      const sortedData = data.sort((a, b) => a.id - b.id)
      setTariffs(sortedData)
    } catch (error) {
      console.error('❌ Failed to load tariffs:', error)
      alert('Failed to load tariffs. Please try again.')
    } finally {
      setLoadingTariffs(false)
    }
  }

  // Create Tariff
  const handleCreateTariff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminTariffService.createTariff(tariffForm)
      alert('Tariff created successfully!')
      setTariffForm({
        hsCode: '',
        importerId: '',
        exporterId: '',
        tariffType: 'Ad Valorem',
        tariffRate: 0,
        specificAmt: null,
        specificUnit: null,
        minTariffAmt: null,
        maxTariffAmt: null,
        startDate: '',
        endDate: '',
      })
      loadTariffs()
    } catch (error) {
      console.error('Failed to create tariff:', error)
      alert('Failed to create tariff. Please check your inputs.')
    }
  }

  // Load Agreements
  const loadAgreements = async () => {
    setLoadingAgreements(true)
    try {
      const data = await adminAgreementService.getAllAgreements()
      // Sort by ID in ascending order
      const sortedData = data.sort((a, b) => a.id - b.id)
      setAgreements(sortedData)
    } catch (error) {
      console.error('Failed to load agreements:', error)
      alert('Failed to load agreements. Please try again.')
    } finally {
      setLoadingAgreements(false)
    }
  }

  // Create Agreement
  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminAgreementService.createAgreement(agreementForm)
      alert('Agreement created successfully!')
      setAgreementForm({
        importerName: '',
        exporterName: '',
        start_date: '',
        end_date: '',
        kind: 'override',
        value: 0,
        note: '',
      })
      loadAgreements()
    } catch (error) {
      console.error('Failed to create agreement:', error)
      alert('Failed to create agreement. Please check your inputs.')
    }
  }

  // Load Countries
  const loadCountries = async () => {
    setLoadingCountries(true)
    try {
      const data = await adminCountryService.getAllCountries()
      // Sort by country_id in ascending order
      const sortedData = data.sort((a, b) => a.country_id - b.country_id)
      setCountries(sortedData)
    } catch (error) {
      console.error('Failed to load countries:', error)
      alert('Failed to load countries. Please try again.')
    } finally {
      setLoadingCountries(false)
    }
  }

  // Filter functions
  const filteredTariffs = tariffs.filter(tariff => {
    if (!tariffSearchQuery.trim()) return true
    const query = tariffSearchQuery.toLowerCase()
    return (
      tariff.hsCode.toLowerCase().includes(query) ||
      tariff.importerId.toLowerCase().includes(query) ||
      tariff.exporterId.toLowerCase().includes(query) ||
      tariff.tariffType.toLowerCase().includes(query) ||
      tariff.id.toString().includes(query)
    )
  })

  const filteredAgreements = agreements.filter(agreement => {
    if (!agreementSearchQuery.trim()) return true
    const query = agreementSearchQuery.toLowerCase()
    return (
      agreement.id.toString().includes(query) ||
      (agreement.importerId && agreement.importerId.toLowerCase().includes(query)) ||
      (agreement.exporterId && agreement.exporterId.toLowerCase().includes(query)) ||
      agreement.kind.toLowerCase().includes(query) ||
      (agreement.note && agreement.note.toLowerCase().includes(query))
    )
  })

  const filteredCountries = countries.filter(country => {
    if (!countrySearchQuery.trim()) return true
    const query = countrySearchQuery.toLowerCase()
    return (
      country.name.toLowerCase().includes(query) ||
      country.code.toLowerCase().includes(query) ||
      country.country_id.toString().includes(query)
    )
  })

  // Pagination calculations for Tariffs (using filtered data)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentTariffs = filteredTariffs.slice(indexOfFirstItem, indexOfLastItem)
  const totalPages = Math.ceil(filteredTariffs.length / itemsPerPage)

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber)
  }

  // Pagination calculations for Agreements (using filtered data)
  const agreementIndexOfLast = agreementPage * itemsPerPage
  const agreementIndexOfFirst = agreementIndexOfLast - itemsPerPage
  const currentAgreements = filteredAgreements.slice(agreementIndexOfFirst, agreementIndexOfLast)
  const agreementTotalPages = Math.ceil(filteredAgreements.length / itemsPerPage)

  const handleAgreementPageChange = (pageNumber: number) => {
    setAgreementPage(pageNumber)
  }

  // Pagination calculations for Countries (using filtered data)
  const countryIndexOfLast = countryPage * itemsPerPage
  const countryIndexOfFirst = countryIndexOfLast - itemsPerPage
  const currentCountries = filteredCountries.slice(countryIndexOfFirst, countryIndexOfLast)
  const countryTotalPages = Math.ceil(filteredCountries.length / itemsPerPage)

  const handleCountryPageChange = (pageNumber: number) => {
    setCountryPage(pageNumber)
  }


  // Render Management page
  const renderManagement = () => (
    <div className="py-8 px-4 max-w-[1800px] mx-auto">
      <h1 className="text-gray-800 mb-8 text-4xl font-bold text-center">Admin Management</h1>
      
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
      {managementTab === 'tariffs' && (
        <div className="space-y-6">
          {/* CSV Bulk Upload */}
          <CsvBulkUpload onUploadComplete={loadTariffs} />

          {/* Create Tariff Form */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Create New Tariff</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <form onSubmit={handleCreateTariff} className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hsCode">HS Code</Label>
                  <Input
                    id="hsCode"
                    value={tariffForm.hsCode}
                    onChange={(e) => setTariffForm({ ...tariffForm, hsCode: e.target.value })}
                    placeholder="e.g., 010121"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tariffType">Tariff Type</Label>
                  <Select
                    value={tariffForm.tariffType}
                    onValueChange={(value) => {
                      const newType = value as 'Ad Valorem' | 'Specific' | 'Compound';
                      setTariffForm({ 
                        ...tariffForm, 
                        tariffType: newType,
                        // Clear fields based on type
                        tariffRate: (newType === 'Specific') ? null : tariffForm.tariffRate,
                        specificAmt: (newType === 'Ad Valorem') ? null : tariffForm.specificAmt,
                        specificUnit: (newType === 'Ad Valorem') ? null : tariffForm.specificUnit,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ad Valorem">Ad Valorem</SelectItem>
                      <SelectItem value="Specific">Specific</SelectItem>
                      <SelectItem value="Compound">Compound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="importerId">Importer Country Code</Label>
                  <Input
                    id="importerId"
                    value={tariffForm.importerId}
                    onChange={(e) => setTariffForm({ ...tariffForm, importerId: e.target.value.toUpperCase() })}
                    placeholder="e.g., SG"
                    maxLength={2}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="exporterId">Exporter Country Code</Label>
                  <Input
                    id="exporterId"
                    value={tariffForm.exporterId}
                    onChange={(e) => setTariffForm({ ...tariffForm, exporterId: e.target.value.toUpperCase() })}
                    placeholder="e.g., MY"
                    maxLength={2}
                    required
                  />
                </div>
                
                {/* Tariff Rate - Show for Ad Valorem and Compound */}
                {(tariffForm.tariffType === 'Ad Valorem' || tariffForm.tariffType === 'Compound') && (
                  <div>
                    <Label htmlFor="tariffRate">Tariff Rate (decimal) *</Label>
                    <Input
                      id="tariffRate"
                      type="number"
                      step="0.0001"
                      value={tariffForm.tariffRate || ''}
                      onChange={(e) => setTariffForm({ ...tariffForm, tariffRate: parseFloat(e.target.value) || null })}
                      placeholder="e.g., 0.05 for 5%"
                      required
                    />
                  </div>
                )}
                
                {/* Specific Amount & Unit - Show for Specific and Compound */}
                {(tariffForm.tariffType === 'Specific' || tariffForm.tariffType === 'Compound') && (
                  <>
                    <div>
                      <Label htmlFor="specificAmt">Specific Amount *</Label>
                      <Input
                        id="specificAmt"
                        type="number"
                        step="0.01"
                        value={tariffForm.specificAmt || ''}
                        onChange={(e) => setTariffForm({ ...tariffForm, specificAmt: parseFloat(e.target.value) || null })}
                        placeholder="e.g., 5.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="specificUnit">Specific Unit *</Label>
                      <Input
                        id="specificUnit"
                        type="text"
                        value={tariffForm.specificUnit || ''}
                        onChange={(e) => setTariffForm({ ...tariffForm, specificUnit: e.target.value || null })}
                        placeholder="e.g., USD per ton, EUR per kg"
                        required
                      />
                    </div>
                  </>
                )}
                
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={tariffForm.startDate}
                    onChange={(e) => setTariffForm({ ...tariffForm, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={tariffForm.endDate}
                    onChange={(e) => setTariffForm({ ...tariffForm, endDate: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2 pt-4">
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Create Tariff</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tariffs Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Tariffs ({tariffs.length} total, {filteredTariffs.length} shown)</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="🔍 Search by ID, HS Code, Importer, Exporter, or Type..."
                  value={tariffSearchQuery}
                  onChange={(e) => {
                    setTariffSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page when searching
                  }}
                  className="w-full"
                />
              </div>
              
              {loadingTariffs ? (
                <p className="text-center py-4">Loading tariffs...</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>HS Code</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Importer</TableHead>
                          <TableHead>Exporter</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Specific Amt</TableHead>
                          <TableHead>Specific Unit</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentTariffs.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-4 text-gray-500">
                              No tariffs found. Create one above!
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentTariffs.map((tariff) => (
                            <TableRow key={tariff.id}>
                              <TableCell>{tariff.id}</TableCell>
                              <TableCell>{tariff.hsCode}</TableCell>
                              <TableCell className="text-xs">{tariff.tariffType}</TableCell>
                              <TableCell>{tariff.importerId}</TableCell>
                              <TableCell>{tariff.exporterId}</TableCell>
                              <TableCell>
                                {tariff.tariffRate !== null && tariff.tariffRate !== undefined 
                                  ? (tariff.tariffRate > 1 
                                      ? tariff.tariffRate.toFixed(2) + '%'  // Already a percentage (5 = 5%)
                                      : (tariff.tariffRate * 100).toFixed(2) + '%')  // Decimal (0.05 = 5%)
                                  : '-'}
                              </TableCell>
                              <TableCell>{tariff.specificAmt || '-'}</TableCell>
                              <TableCell className="text-xs">{tariff.specificUnit || '-'}</TableCell>
                              <TableCell className="text-xs">{tariff.startDate}</TableCell>
                              <TableCell className="text-xs">{tariff.endDate}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <Button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {managementTab === 'agreements' && (
        <div className="space-y-6">
          {/* Create Agreement Form */}
          <Card>
            <CardHeader>
              <CardTitle>🤝 Create New Agreement</CardTitle>
            </CardHeader>
            <CardContent className="max-h-[600px] overflow-y-auto">
              <form onSubmit={handleCreateAgreement} className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="importerName">Importer Country</Label>
                  <Popover open={importerCountryOpen} onOpenChange={setImporterCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={importerCountryOpen}
                        className="w-full justify-between"
                        disabled={loadingCountries}
                        type="button"
                      >
                        {agreementForm.importerName || (loadingCountries ? 'Loading countries...' : 'Select importer country...')}
                        <ChevronsUpDown className="opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search country..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countries.map((country) => (
                              <CommandItem
                                key={country.country_id}
                                value={country.name}
                                onSelect={(currentValue) => {
                                  setAgreementForm({ ...agreementForm, importerName: currentValue })
                                  setImporterCountryOpen(false)
                                }}
                              >
                                {country.name}
                                <Check
                                  className={cn(
                                    "ml-auto",
                                    agreementForm.importerName === country.name ? "opacity-100" : "opacity-0"
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
                <div>
                  <Label htmlFor="exporterName">Exporter Country</Label>
                  <Popover open={exporterCountryOpen} onOpenChange={setExporterCountryOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={exporterCountryOpen}
                        className="w-full justify-between"
                        disabled={loadingCountries}
                        type="button"
                      >
                        {agreementForm.exporterName || (loadingCountries ? 'Loading countries...' : 'Select exporter country...')}
                        <ChevronsUpDown className="opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search country..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {countries.map((country) => (
                              <CommandItem
                                key={country.country_id}
                                value={country.name}
                                onSelect={(currentValue) => {
                                  setAgreementForm({ ...agreementForm, exporterName: currentValue })
                                  setExporterCountryOpen(false)
                                }}
                              >
                                {country.name}
                                <Check
                                  className={cn(
                                    "ml-auto",
                                    agreementForm.exporterName === country.name ? "opacity-100" : "opacity-0"
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
                <div>
                  <Label htmlFor="agr_start_date">Start Date</Label>
                  <Input
                    id="agr_start_date"
                    type="date"
                    value={agreementForm.start_date}
                    onChange={(e) => setAgreementForm({ ...agreementForm, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="agr_end_date">End Date</Label>
                  <Input
                    id="agr_end_date"
                    type="date"
                    value={agreementForm.end_date}
                    onChange={(e) => setAgreementForm({ ...agreementForm, end_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="kind">Agreement Type</Label>
                  <Select
                    value={agreementForm.kind}
                    onValueChange={(value) => setAgreementForm({ ...agreementForm, kind: value as 'override' | 'surcharge' | 'multiplier' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="override">Override</SelectItem>
                      <SelectItem value="surcharge">Surcharge</SelectItem>
                      <SelectItem value="multiplier">Multiplier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.0001"
                    value={agreementForm.value}
                    onChange={(e) => setAgreementForm({ ...agreementForm, value: parseFloat(e.target.value) })}
                    placeholder="e.g., 0.05"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="note">Note (Optional)</Label>
                  <Input
                    id="note"
                    value={agreementForm.note}
                    onChange={(e) => setAgreementForm({ ...agreementForm, note: e.target.value })}
                    placeholder="e.g., Trade agreement details"
                  />
                </div>
                <div className="col-span-2 pt-4">
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">Create Agreement</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Agreements Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Agreements ({agreements.length} total, {filteredAgreements.length} shown)</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="🔍 Search by ID, Importer, Exporter, Type, or Note..."
                  value={agreementSearchQuery}
                  onChange={(e) => {
                    setAgreementSearchQuery(e.target.value)
                    setAgreementPage(1) // Reset to first page when searching
                  }}
                  className="w-full"
                />
              </div>
              
              {loadingAgreements ? (
                <p className="text-center py-4">Loading agreements...</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Importer</TableHead>
                          <TableHead>Exporter</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Note</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAgreements.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                              No agreements found. Create one above!
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentAgreements.map((agreement) => (
                            <TableRow key={agreement.id}>
                              <TableCell>{agreement.id}</TableCell>
                              <TableCell>{agreement.importerId}</TableCell>
                              <TableCell>{agreement.exporterId}</TableCell>
                              <TableCell className="capitalize">{agreement.kind}</TableCell>
                              <TableCell>{agreement.value}</TableCell>
                              <TableCell className="text-xs">{agreement.start_date}</TableCell>
                              <TableCell className="text-xs">{agreement.end_date}</TableCell>
                              <TableCell className="text-xs">{agreement.note || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {agreementTotalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <Button
                        onClick={() => handleAgreementPageChange(agreementPage - 1)}
                        disabled={agreementPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {agreementPage} of {agreementTotalPages}
                      </span>
                      <Button
                        onClick={() => handleAgreementPageChange(agreementPage + 1)}
                        disabled={agreementPage === agreementTotalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {managementTab === 'countries' && (
        <div className="space-y-6">
          {/* Countries Table (Read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>🌍 All Countries ({countries.length} total, {filteredCountries.length} shown)</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="🔍 Search by ID, Country Name, or Code..."
                  value={countrySearchQuery}
                  onChange={(e) => {
                    setCountrySearchQuery(e.target.value)
                    setCountryPage(1) // Reset to first page when searching
                  }}
                  className="w-full"
                />
              </div>
              
              {loadingCountries ? (
                <p className="text-center py-4">Loading countries...</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Country Name</TableHead>
                          <TableHead>Country Code</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentCountries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                              No countries found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          currentCountries.map((country) => (
                            <TableRow key={country.country_id}>
                              <TableCell>{country.country_id}</TableCell>
                              <TableCell>{country.name}</TableCell>
                              <TableCell>{country.code}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* Pagination */}
                  {countryTotalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4">
                      <Button
                        onClick={() => handleCountryPageChange(countryPage - 1)}
                        disabled={countryPage === 1}
                        variant="outline"
                        size="sm"
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {countryPage} of {countryTotalPages}
                      </span>
                      <Button
                        onClick={() => handleCountryPageChange(countryPage + 1)}
                        disabled={countryPage === countryTotalPages}
                        variant="outline"
                        size="sm"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
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
