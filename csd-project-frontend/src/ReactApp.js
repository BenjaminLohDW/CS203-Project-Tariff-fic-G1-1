import React, { useState } from 'react';
import './App.css';

function App() {
  // State for page navigation
  const [currentPage, setCurrentPage] = useState('calculation');
  
  // State for storing selected values
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedImportingCountry, setSelectedImportingCountry] = useState('');
  const [selectedExportingCountry, setSelectedExportingCountry] = useState('');
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // State for manual tariff mode
  const [isManualTariff, setIsManualTariff] = useState(false);
  const [tariffRate, setTariffRate] = useState('');
  
  // State for calculated values (only updated when calculate button is clicked)
  const [calculatedProduct, setCalculatedProduct] = useState('');
  const [calculatedImportingCountry, setCalculatedImportingCountry] = useState('');
  const [calculatedExportingCountry, setCalculatedExportingCountry] = useState('');
  const [calculatedQuantity, setCalculatedQuantity] = useState('');
  const [calculatedCost, setCalculatedCost] = useState('');
  const [calculatedStartDate, setCalculatedStartDate] = useState('');
  const [calculatedEndDate, setCalculatedEndDate] = useState('');
  const [calculatedTariffRate, setCalculatedTariffRate] = useState('');
  
  // State for API tariff data
  const [tariffData, setTariffData] = useState([]);
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(false);
  
  // State for saved calculation history
  const [calculationHistory, setCalculationHistory] = useState([]);
  
  // State for date validation
  const [dateValidationError, setDateValidationError] = useState('');
  
  // State for country validation
  const [countryValidationError, setCountryValidationError] = useState('');
  
  // State to track if fields have been modified after calculation
  const [fieldsModified, setFieldsModified] = useState(false);

  // Test data for dropdowns
  const productTypes = [
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Textiles' },
    { id: 3, name: 'Food Products' }
  ];

  const countries = [
    { id: 1, name: 'United States' },
    { id: 2, name: 'Singapore' },
    { id: 3, name: 'China' }
  ];

  // Handle dropdown changes
  const handleProductChange = (e) => {
    setSelectedProduct(e.target.value);
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true);
    }
  };

  const handleImportingCountryChange = (e) => {
    const newImportingCountry = e.target.value;
    setSelectedImportingCountry(newImportingCountry);
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true);
    }
    
    // Validate countries are different if both are selected
    if (newImportingCountry && selectedExportingCountry && newImportingCountry === selectedExportingCountry) {
      setCountryValidationError('Importing and exporting countries cannot be the same');
    } else {
      setCountryValidationError('');
    }
  };

  const handleExportingCountryChange = (e) => {
    const newExportingCountry = e.target.value;
    setSelectedExportingCountry(newExportingCountry);
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true);
    }
    
    // Validate countries are different if both are selected
    if (selectedImportingCountry && newExportingCountry && selectedImportingCountry === newExportingCountry) {
      setCountryValidationError('Importing and exporting countries cannot be the same');
    } else {
      setCountryValidationError('');
    }
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Only allow positive whole numbers
    if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 1)) {
      setQuantity(value);
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true);
      }
    }
  };

  const handleCostChange = (e) => {
    const value = e.target.value;
    // Allow positive numbers (including decimals)
    if (value === '' || (!isNaN(value) && Number(value) >= 0)) {
      setCost(value);
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true);
      }
    }
  };

  const handleManualTariffChange = (e) => {
    setIsManualTariff(e.target.checked);
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true);
    }
    // Clear validation errors when switching modes
    setCountryValidationError('');
    setDateValidationError('');
  };

  const handleTariffRateChange = (e) => {
    const value = e.target.value;
    // Only allow numbers between 0 and 100 (inclusive, with decimals)
    if (value === '' || (!isNaN(value) && Number(value) >= 0 && Number(value) <= 100)) {
      setTariffRate(value);
      // Mark fields as modified if there are calculated values
      if (calculatedProduct) {
        setFieldsModified(true);
      }
    }
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setStartDate(newStartDate);
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true);
    }
    
    // Validate dates if both are set
    if (newStartDate && endDate && new Date(newStartDate) > new Date(endDate)) {
      setDateValidationError('Start date cannot be after end date');
    } else {
      setDateValidationError('');
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDate = e.target.value;
    setEndDate(newEndDate);
    
    // Mark fields as modified if there are calculated values
    if (calculatedProduct) {
      setFieldsModified(true);
    }
    
    // Validate dates if both are set
    if (startDate && newEndDate && new Date(startDate) > new Date(newEndDate)) {
      setDateValidationError('Start date cannot be after end date');
    } else {
      setDateValidationError('');
    }
  };

  // Tariff calculation functions
  const calculateSpecificTariff = (quantity, tariffAmount) => {
    // Specific tariff: fixed amount per unit (tariffAmount is cost per unit)
    return Number(quantity) * Number(tariffAmount);
  };

  const calculateAdValoremTariff = (baseValue, tariffRate) => {
    // Ad valorem tariff: percentage of the value (tariffRate is percentage)
    return Number(baseValue) * (Number(tariffRate) / 100);
  };

  // Hashmap/Dictionary mapping tariff types to calculation functions
  const tariffCalculationMap = {
    'specific': calculateSpecificTariff,
    'ad valorem': calculateAdValoremTariff,
    'compound': calculateAdValoremTariff, // Can be extended later for compound tariffs
    'quota': calculateAdValoremTariff // Can be extended later for quota tariffs
  };

  // Function to calculate tariff amount based on type
  const calculateTariffAmount = (tariffType, quantity, baseValue, tariffAmount) => {
    const calculationFunction = tariffCalculationMap[tariffType.toLowerCase()];
    
    if (!calculationFunction) {
      console.warn(`Unknown tariff type: ${tariffType}`);
      return 0;
    }

    switch (tariffType.toLowerCase()) {
      case 'specific':
        return calculationFunction(quantity, tariffAmount);
      case 'ad valorem':
      default:
        return calculationFunction(baseValue, tariffAmount);
    }
  };

  // Simulate API call to Tariff microservice
  const fetchTariffData = async () => {
    setIsLoadingTariffs(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock API response - test tariff data
    const mockTariffResponse = [
      {
        "Tariff Type": "ad valorem",
        "Tariff Description": "US Import Duty on Electronics",
        "Tariff amount": 15.5  // 15.5% of value
      },
      {
        "Tariff Type": "ad valorem",
        "Tariff Description": "Value Added Tax (VAT)",
        "Tariff amount": 8.25  // 8.25% of value
      },
      {
        "Tariff Type": "specific",
        "Tariff Description": "Processing and Handling Fee",
        "Tariff amount": 2.50  // $2.50 per unit
      },
      {
        "Tariff Type": "ad valorem",
        "Tariff Description": "Environmental Protection Tax",
        "Tariff amount": 3.75  // 3.75% of value
      },
      {
        "Tariff Type": "specific",
        "Tariff Description": "Port Security Surcharge",
        "Tariff amount": 1.25  // $1.25 per unit
      }
    ];
    
    setTariffData(mockTariffResponse);
    setIsLoadingTariffs(false);
    
    return mockTariffResponse;
  };

  // Handle calculate button click
  const handleCalculate = async () => {
    // Clear previous results immediately when calculate is clicked
    setCalculatedProduct('');
    setCalculatedImportingCountry('');
    setCalculatedExportingCountry('');
    setCalculatedQuantity('');
    setCalculatedCost('');
    setCalculatedStartDate('');
    setCalculatedEndDate('');
    setCalculatedTariffRate('');
    setTariffData([]);
    
    // Reset fields modified flag since we're recalculating
    setFieldsModified(false);
    
    // Set basic calculated values
    setCalculatedProduct(selectedProduct);
    setCalculatedImportingCountry(selectedImportingCountry);
    setCalculatedExportingCountry(selectedExportingCountry);
    setCalculatedQuantity(quantity);
    setCalculatedCost(cost);
    setCalculatedStartDate(startDate);
    setCalculatedEndDate(endDate);
    setCalculatedTariffRate(tariffRate);
    
    // Fetch tariff data from API (simulated)
    if (quantity && cost) {
      await fetchTariffData();
    }
  };

  // Handle save calculation to history
  const handleSaveCalculation = () => {
    // Check if there are calculated values to save
    if (isManualTariff) {
      if (!calculatedQuantity && !calculatedCost && !calculatedTariffRate) {
        alert('No calculation results to save. Please calculate first.');
        return;
      }
    } else {
      if (!calculatedProduct && !calculatedImportingCountry && !calculatedExportingCountry && !calculatedQuantity && !calculatedCost && !calculatedStartDate && !calculatedEndDate) {
        alert('No calculation results to save. Please calculate first.');
        return;
      }
    }

    // Create JSON object for the calculation
    const calculationData = {
      id: Date.now(), // Simple ID using timestamp
      date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
      timestamp: new Date().toLocaleString(),
      mode: isManualTariff ? 'Manual Tariff' : 'Standard',
      productType: calculatedProduct || 'Not specified',
      importingCountry: calculatedImportingCountry || 'Not specified',
      exportingCountry: calculatedExportingCountry || 'Not specified',
      quantity: calculatedQuantity || 'Not specified',
      cost: calculatedCost || 'Not specified',
      tariffRate: calculatedTariffRate || 'Not specified',
      startDate: calculatedStartDate || 'Not specified',
      endDate: calculatedEndDate || 'Not specified',
      baseAmount: calculatedQuantity && calculatedCost ? (Number(calculatedQuantity) * Number(calculatedCost)).toFixed(2) : 'Not calculated',
      tariffs: tariffData.length > 0 ? tariffData.map(tariff => ({
        type: tariff["Tariff Type"],
        description: tariff["Tariff Description"],
        rate: tariff["Tariff amount"],
        amount: calculatedQuantity && calculatedCost ? 
          calculateTariffAmount(
            tariff["Tariff Type"], 
            calculatedQuantity, 
            Number(calculatedQuantity) * Number(calculatedCost), 
            tariff["Tariff amount"]
          ).toFixed(2) : 
          'Not calculated'
      })) : [],
      totalAmount: calculatedQuantity && calculatedCost && tariffData.length > 0 ? 
        (() => {
          const baseAmount = Number(calculatedQuantity) * Number(calculatedCost);
          const totalTariffs = tariffData.reduce((sum, tariff) => {
            const tariffAmount = calculateTariffAmount(
              tariff["Tariff Type"], 
              calculatedQuantity, 
              baseAmount, 
              tariff["Tariff amount"]
            );
            return sum + tariffAmount;
          }, 0);
          return (baseAmount + totalTariffs).toFixed(2);
        })() : 'Not calculated',
      status: 'Calculation completed'
    };

    // Add to history
    setCalculationHistory(prevHistory => [calculationData, ...prevHistory]);
    
    // Show confirmation
    alert('Calculation saved to history!');
  };

  // Navigation functions
  const showCalculation = () => {
    setCurrentPage('calculation');
  };

  const showHistory = () => {
    setCurrentPage('history');
  };

  // Function to restore calculation from history
  const restoreCalculationFromHistory = async (calculationData) => {
    // Navigate to calculation page
    setCurrentPage('calculation');
    
    // Set manual tariff mode based on saved data
    const isManualMode = calculationData.mode === 'Manual Tariff';
    setIsManualTariff(isManualMode);
    
    // Populate input fields
    setQuantity(calculationData.quantity !== 'Not specified' ? calculationData.quantity : '');
    setCost(calculationData.cost !== 'Not specified' ? calculationData.cost : '');
    
    if (!isManualMode) {
      // Standard mode - populate all fields
      setSelectedProduct(calculationData.productType !== 'Not specified' ? calculationData.productType : '');
      setSelectedImportingCountry(calculationData.importingCountry !== 'Not specified' ? calculationData.importingCountry : '');
      setSelectedExportingCountry(calculationData.exportingCountry !== 'Not specified' ? calculationData.exportingCountry : '');
      setStartDate(calculationData.startDate !== 'Not specified' ? calculationData.startDate : '');
      setEndDate(calculationData.endDate !== 'Not specified' ? calculationData.endDate : '');
    } else {
      // Manual tariff mode - populate tariff rate
      setTariffRate(calculationData.tariffRate !== 'Not specified' ? calculationData.tariffRate : '');
    }
    
    // Set calculated values
    setCalculatedProduct(calculationData.productType !== 'Not specified' ? calculationData.productType : '');
    setCalculatedImportingCountry(calculationData.importingCountry !== 'Not specified' ? calculationData.importingCountry : '');
    setCalculatedExportingCountry(calculationData.exportingCountry !== 'Not specified' ? calculationData.exportingCountry : '');
    setCalculatedQuantity(calculationData.quantity !== 'Not specified' ? calculationData.quantity : '');
    setCalculatedCost(calculationData.cost !== 'Not specified' ? calculationData.cost : '');
    setCalculatedStartDate(calculationData.startDate !== 'Not specified' ? calculationData.startDate : '');
    setCalculatedEndDate(calculationData.endDate !== 'Not specified' ? calculationData.endDate : '');
    setCalculatedTariffRate(calculationData.tariffRate !== 'Not specified' ? calculationData.tariffRate : '');
    
    // Restore tariff data if it exists
    if (calculationData.tariffs && calculationData.tariffs.length > 0) {
      const restoredTariffData = calculationData.tariffs.map(tariff => ({
        "Tariff Type": tariff.type,
        "Tariff Description": tariff.description,
        "Tariff amount": tariff.rate
      }));
      setTariffData(restoredTariffData);
    }
    
    // Clear any validation errors
    setDateValidationError('');
    setCountryValidationError('');
  };

  // Render Calculation page
  const renderCalculationPage = () => (
    <div className="page-content">
      <h1>Trade Calculation</h1>
      
      <div className="dropdown-section">
        <div className="dropdown-group">
          <label htmlFor="quantity">Quantity:</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            onChange={handleQuantityChange}
            placeholder="Enter value here"
            min="1"
            step="1"
            className="dropdown"
          />
        </div>

        <div className="dropdown-group">
          <label htmlFor="cost">Cost ($):</label>
          <input
            type="number"
            id="cost"
            value={cost}
            onChange={handleCostChange}
            placeholder="Enter cost here"
            min="0"
            step="0.01"
            className="dropdown"
          />
        </div>

        <div className="dropdown-group">
          <label>
            <input
              type="checkbox"
              checked={isManualTariff}
              onChange={handleManualTariffChange}
              style={{ marginRight: '8px' }}
            />
            Insert Tariff rate manually
          </label>
        </div>

        {isManualTariff ? (
          // Manual tariff mode - only show tariff rate field
          <div className="dropdown-group">
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
              className="dropdown"
            />
          </div>
        ) : (
          // Normal mode - show all other fields
          <>
            <div className="dropdown-group">
              <label htmlFor="product-type">Product Type:</label>
              <select 
                id="product-type" 
                value={selectedProduct} 
                onChange={handleProductChange}
                className="dropdown"
                style={{ width: '100%' }}
              >
                <option value="">Select a product type...</option>
                {productTypes.map(product => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-group">
              <label htmlFor="importing-country">Importing Country:</label>
              <select 
                id="importing-country" 
                value={selectedImportingCountry} 
                onChange={handleImportingCountryChange}
                className="dropdown"
                style={{ width: '100%' }}
              >
                <option value="">Select importing country...</option>
                {countries.map(country => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="dropdown-group">
              <label htmlFor="exporting-country">Exporting Country:</label>
              <select 
                id="exporting-country" 
                value={selectedExportingCountry} 
                onChange={handleExportingCountryChange}
                className="dropdown"
                style={{ width: '100%' }}
              >
                <option value="">Select exporting country...</option>
                {countries.map(country => (
                  <option key={country.id} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Country validation error message */}
            {countryValidationError && (
              <div className="country-error" style={{ color: 'red', fontSize: '14px', marginTop: '5px', marginBottom: '10px' }}>
                ⚠️ {countryValidationError}
              </div>
            )}

            <div className="dropdown-group">
              <label htmlFor="start-date">Start Date:</label>
              <input
                type="date"
                id="start-date"
                value={startDate}
                onChange={handleStartDateChange}
                className="dropdown date-input"
                style={{ cursor: 'pointer' }}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
              />
            </div>

            <div className="dropdown-group">
              <label htmlFor="end-date">End Date:</label>
              <input
                type="date"
                id="end-date"
                value={endDate}
                onChange={handleEndDateChange}
                className="dropdown date-input"
                style={{ cursor: 'pointer' }}
                onClick={(e) => e.target.showPicker && e.target.showPicker()}
              />
            </div>
            
            {/* Date validation error message */}
            {dateValidationError && (
              <div className="date-error" style={{ color: 'red', fontSize: '14px', marginTop: '5px', marginBottom: '10px' }}>
                ⚠️ {dateValidationError}
              </div>
            )}
          </>
        )}
      </div>

      {/* Calculate Button */}
      <div className="calculate-button-container" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button 
          className="calculate-button"
          onClick={handleCalculate}
          disabled={isManualTariff ? false : (dateValidationError !== '' || countryValidationError !== '')}
          style={{
            opacity: (isManualTariff ? false : (dateValidationError !== '' || countryValidationError !== '')) ? 0.5 : 1,
            cursor: (isManualTariff ? false : (dateValidationError !== '' || countryValidationError !== '')) ? 'not-allowed' : 'pointer'
          }}
        >
          Calculate
        </button>
        
        {/* Hint to recalculate when fields are modified */}
        {fieldsModified && (
          <div style={{ 
            color: '#ff6b35', 
            fontSize: '14px', 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span>Fields have been modified. Click Calculate to update results.</span>
          </div>
        )}
      </div>

      {/* Display calculated values */}
      <div className="selection-summary">
        <h3>Calculation Results:</h3>
        
        {/* Base Quantity Cost calculation */}
        {quantity && cost && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold' }}><strong>Base Quantity Cost:</strong></div>
            <div style={{ marginLeft: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
              <span>
                <span style={{ color: '#007bff' }}>{Number(quantity).toLocaleString()}</span>
                {' × '}
                <span style={{ color: '#28a745' }}>${Number(cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {' = '}
              </span>
              <span style={{ color: '#dc3545', fontSize: '20px' }}>${(Number(quantity) * Number(cost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Show calculated base quantity cost if different from dynamic calculation */}
        {calculatedQuantity && calculatedCost && (calculatedQuantity !== quantity || calculatedCost !== cost) && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold' }}><strong>Calculated Base Quantity Cost:</strong></div>
            <div style={{ marginLeft: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
              <span>
                <span style={{ color: '#007bff' }}>{Number(calculatedQuantity).toLocaleString()}</span>
                {' × '}
                <span style={{ color: '#28a745' }}>${Number(calculatedCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                {' = '}
              </span>
              <span style={{ color: '#dc3545', fontSize: '20px' }}>${(Number(calculatedQuantity) * Number(calculatedCost)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Loading indicator for tariffs */}
        {isLoadingTariffs && (
          <div style={{ marginTop: '20px', fontSize: '16px', fontStyle: 'italic' }}>
            Loading tariff data from API...
          </div>
        )}

        {/* Tariff Calculations */}
        {tariffData.length > 0 && calculatedQuantity && calculatedCost && (
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '10px' }}><strong>Tariff Calculations:</strong></div>
            {tariffData.map((tariff, index) => {
              const baseAmount = Number(calculatedQuantity) * Number(calculatedCost);
              const tariffAmount = calculateTariffAmount(
                tariff["Tariff Type"], 
                calculatedQuantity, 
                baseAmount, 
                tariff["Tariff amount"]
              );
              
              return (
                <div key={index} style={{ marginLeft: '20px', marginBottom: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#6c757d' }}>
                    {tariff["Tariff Description"]} ({tariff["Tariff Type"]}, {tariff["Tariff Type"].toLowerCase() === 'specific' ? `$${tariff["Tariff amount"]} per unit` : `${tariff["Tariff amount"]}%`}):
                  </div>
                  <div style={{ marginLeft: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '16px' }}>
                    <span>
                      {tariff["Tariff Type"].toLowerCase() === 'specific' ? (
                        <>
                          <span style={{ color: '#6c757d' }}>{Number(calculatedQuantity).toLocaleString()}</span>
                          {' × '}
                          <span style={{ color: '#6c757d' }}>${Number(tariff["Tariff amount"]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {' = '}
                        </>
                      ) : (
                        <>
                          <span style={{ color: '#6c757d' }}>${baseAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          {' × '}
                          <span style={{ color: '#6c757d' }}>{tariff["Tariff amount"]}%</span>
                          {' = '}
                        </>
                      )}
                    </span>
                    <span style={{ color: '#dc3545', fontSize: '18px', fontWeight: 'bold' }}>${tariffAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })}
            
            {/* Total with all tariffs */}
            <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '2px solid #dee2e6' }}>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
                <strong>Total Amount (including all tariffs):</strong>
              </div>
              <div style={{ marginLeft: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                <span>
                  Base Cost + All Tariffs = 
                </span>
                <span style={{ color: '#dc3545', fontSize: '22px' }}>
                  ${(() => {
                    const baseAmount = Number(calculatedQuantity) * Number(calculatedCost);
                    const totalTariffs = tariffData.reduce((sum, tariff) => {
                      const tariffAmount = calculateTariffAmount(
                        tariff["Tariff Type"], 
                        calculatedQuantity, 
                        baseAmount, 
                        tariff["Tariff amount"]
                      );
                      return sum + tariffAmount;
                    }, 0);
                    return (baseAmount + totalTariffs).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Save Calculation Button */}
        <div className="save-button-container">
          <button 
            className="save-button"
            onClick={handleSaveCalculation}
          >
            Save Calculation
          </button>
        </div>
      </div>
    </div>
  );

  // Render History page
  const renderHistoryPage = () => (
    <div className="page-content">
      <h1>Calculation History</h1>
      <div className="history-content">
        <p>Here you can view your saved trade calculations and search history.</p>
        
        <div className="history-placeholder">
          <h3>Saved Calculations ({calculationHistory.length})</h3>
          
          {calculationHistory.length === 0 ? (
            <div className="no-history">
              <p>No calculations saved yet. Go to the Calculation page to create and save calculations.</p>
            </div>
          ) : (
            calculationHistory.map(calculation => (
              <div key={calculation.id} className="history-item">
                <div className="history-header">
                  <p><strong>Date:</strong> {calculation.date}</p>
                  <p><strong>Time:</strong> {calculation.timestamp}</p>
                  <p><strong>Mode:</strong> {calculation.mode}</p>
                </div>
                <p><strong>Quantity:</strong> {calculation.quantity}</p>
                <p><strong>Cost:</strong> {calculation.cost !== 'Not specified' ? `$${calculation.cost}` : calculation.cost}</p>
                {calculation.mode === 'Manual Tariff' ? (
                  <p><strong>Tariff Rate:</strong> {calculation.tariffRate !== 'Not specified' ? `${calculation.tariffRate}%` : calculation.tariffRate}</p>
                ) : (
                  <>
                    <p><strong>Product Type:</strong> {calculation.productType}</p>
                    <p><strong>Importing Country:</strong> {calculation.importingCountry}</p>
                    <p><strong>Exporting Country:</strong> {calculation.exportingCountry}</p>
                    <p><strong>Start Date:</strong> {calculation.startDate}</p>
                    <p><strong>End Date:</strong> {calculation.endDate}</p>
                  </>
                )}
                <p><strong>Status:</strong> {calculation.status}</p>
                <p><strong>Total Cost:</strong> {calculation.totalAmount !== 'Not calculated' ? `$${Number(calculation.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : calculation.totalAmount}</p>
                
                {/* View Detailed Summary Button */}
                <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #dee2e6' }}>
                  <button 
                    onClick={() => restoreCalculationFromHistory(calculation)}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
                  >
                    View Detailed Summary
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
        
        {/* Sample data section - only show if no real history */}
        {calculationHistory.length === 0 && (
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
  );

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <h2 className="nav-logo">Trade Platform</h2>
          <div className="nav-links">
            <button 
              className={`nav-button ${currentPage === 'calculation' ? 'active' : ''}`}
              onClick={showCalculation}
            >
              Calculation
            </button>
            <button 
              className={`nav-button ${currentPage === 'history' ? 'active' : ''}`}
              onClick={showHistory}
            >
              History
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        {currentPage === 'calculation' ? renderCalculationPage() : renderHistoryPage()}
      </div>
    </div>
  );
}

export default App;
