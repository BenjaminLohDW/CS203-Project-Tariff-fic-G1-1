import { useState } from 'react'
import Select from 'react-select'
import { groupedProducts } from './productData'

interface ProductAutocompleteProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

const ProductAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Search and select a product...",
  disabled = false,
  className = ""
}: ProductAutocompleteProps) => {
  const [isHsCodeMode, setIsHsCodeMode] = useState(false) // Default to product search mode
  const [hsCodeValue, setHsCodeValue] = useState('')
  // Custom styles for React Select to match Tailwind design
  const customStyles = {
    control: (provided: any, state: any) => ({
      ...provided,
      minHeight: '48px', // Matches Tailwind p-3 height
      border: state.isFocused ? '2px solid #3b82f6' : '2px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
      backgroundColor: disabled ? '#f9fafb' : '#ffffff',
      cursor: disabled ? 'not-allowed' : 'pointer',
      '&:hover': {
        borderColor: disabled ? '#d1d5db' : '#3b82f6'
      },
      fontSize: '16px',
      fontFamily: 'inherit'
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '16px'
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#111827',
      fontSize: '16px'
    }),
    menu: (provided: any) => ({
      ...provided,
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      zIndex: 9999
    }),
    menuList: (provided: any) => ({
      ...provided,
      maxHeight: '300px',
      borderRadius: '8px'
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#3b82f6' 
        : state.isFocused 
        ? '#eff6ff' 
        : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#111827',
      cursor: 'pointer',
      fontSize: '15px',
      padding: '12px 16px',
      '&:hover': {
        backgroundColor: state.isSelected ? '#3b82f6' : '#eff6ff'
      }
    }),
    groupHeading: (provided: any) => ({
      ...provided,
      backgroundColor: '#f3f4f6',
      color: '#374151',
      fontSize: '14px',
      fontWeight: '600',
      padding: '8px 16px',
      textTransform: 'none',
      position: 'sticky',
      top: 0,
      zIndex: 1
    }),
    noOptionsMessage: (provided: any) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '15px',
      padding: '12px 16px'
    }),
    loadingMessage: (provided: any) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '15px',
      padding: '12px 16px'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (provided: any, state: any) => ({
      ...provided,
      color: state.isFocused ? '#3b82f6' : '#6b7280',
      '&:hover': {
        color: '#3b82f6'
      },
      padding: '8px'
    })
  }

  // Filter function for fast searching
  const filterOption = (option: any, inputValue: any) => {
    if (!inputValue) return true
    
    const searchTerm = inputValue.toLowerCase()
    const label = option.label.toLowerCase()
    const fullName = option.data.fullName?.toLowerCase() || option.fullName?.toLowerCase() || ''
    const category = option.data.category?.toLowerCase() || option.category?.toLowerCase() || ''
    
    // Search in short name, full name, and category
    return label.includes(searchTerm) || 
           fullName.includes(searchTerm) || 
           category.includes(searchTerm)
  }

  // Custom option component to show category and full name
  const formatOptionLabel = (option: any, { context }: any) => {
    if (context === 'menu') {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{option.label}</span>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mt-0.5">{option.category}</span>
            {option.fullName && option.fullName !== option.label && (
              <span className="text-xs text-gray-400 italic">{option.fullName}</span>
            )}
          </div>
        </div>
      )
    }
    return option.label
  }

  // Show popular products when no search term
  // const getOptions = (inputValue: any) => {
  //   if (!inputValue || inputValue.length < 2) {
  //     return [
  //       {
  //         label: "Popular Products",
  //         options: popularProducts
  //       }
  //     ]
  //   }
  //   return groupedProducts
  // }

  // Handle mode toggle
  const handleModeToggle = () => {
    setIsHsCodeMode(!isHsCodeMode)
    if (!isHsCodeMode) {
      // Switching to HS code mode - clear product selection
      onChange(null)
      setHsCodeValue('')
    } else {
      // Switching to product mode - clear HS code
      setHsCodeValue('')
    }
  }

  // Handle HS code input
  const handleHsCodeChange = (e: any) => {
    const newValue = e.target.value
    setHsCodeValue(newValue)
    
    // Create a fake option object for HS code
    const hsCodeOption = {
      value: newValue,
      label: newValue,
      isHsCode: true,
      category: "HS Code"
    }
    
    onChange(newValue ? hsCodeOption : null)
  }

  // Validate HS code format (basic validation - adjust as needed)
  const isValidHsCode = (code: any) => {
    // HS codes are typically 6-10 digits
    return /^\d{4,10}$/.test(code)
  }

  // Extract API-friendly name from product label
  // Takes "Smartphones and Mobile Devices" and returns "smartphone"
  const extractApiName = (label: string): string => {
    if (!label) return ''
    
    // Get first word, remove special characters, convert to lowercase
    const firstWord = label
      .split(/\s+/)[0]  // Split by whitespace and get first word
      .replace(/[^a-zA-Z0-9]/g, '')  // Remove special characters
      .toLowerCase()
    
    return firstWord
  }

  // Handle product selection with API name extraction
  const handleProductSelect = (selectedOption: any) => {
    if (!selectedOption) {
      onChange(null)
      return
    }

    // Add apiName property for backend API calls
    const enhancedOption = {
      ...selectedOption,
      apiName: extractApiName(selectedOption.label)
    }

    onChange(enhancedOption)
  }

  return (
    <div className={className}>
      {/* Mode Toggle Button */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {isHsCodeMode ? 'HS Code Input' : 'Product Search'}
        </span>
        <button
          type="button"
          onClick={handleModeToggle}
          disabled={disabled}
          className={`
            px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200
            ${disabled 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : isHsCodeMode 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {isHsCodeMode ? 'Switch to Product Search' : 'Enter HS Code'}
        </button>
      </div>

      {/* Conditional Input Field */}
      {isHsCodeMode ? (
        <div className="relative">
          <input
            type="text"
            value={hsCodeValue}
            onChange={handleHsCodeChange}
            placeholder="Enter HS Code (e.g., 8517120000)"
            disabled={disabled}
            className={`
              w-full px-4 py-3 text-base border-2 rounded-lg transition-colors duration-200
              ${disabled 
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
                : hsCodeValue && !isValidHsCode(hsCodeValue)
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/10'
              }
              focus:outline-none focus:ring-4
            `}
            aria-label="HS Code input"
          />
          {hsCodeValue && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {isValidHsCode(hsCodeValue) ? (
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
          )}
          {hsCodeValue && !isValidHsCode(hsCodeValue) && (
            <p className="mt-1 text-xs text-red-600">
              HS Code should be 4-10 digits (e.g., 8517120000)
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Enter the Harmonized System (HS) tariff code directly
          </p>
        </div>
      ) : (
        <Select
          value={value}
          onChange={handleProductSelect}
          options={groupedProducts}
          styles={customStyles}
          placeholder={placeholder}
          isDisabled={disabled}
          isSearchable={true}
          isClearable={true}
          filterOption={filterOption}
          formatOptionLabel={formatOptionLabel}
          noOptionsMessage={({ inputValue }) => 
            inputValue ? `No products found for "${inputValue}"` : "Start typing to search products..."
          }
          loadingMessage={() => "Loading products..."}
          menuPlacement="auto"
          menuShouldScrollIntoView={true}
          // Performance optimizations
          menuShouldBlockScroll={false}
          blurInputOnSelect={true}
          captureMenuScroll={false}
          // Accessibility
          aria-label="Product search"
          inputId="product-autocomplete"
          // Mobile optimizations
          menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
          menuPosition="fixed"
          // Custom class names for additional styling if needed
          classNamePrefix="product-select"
          className="product-autocomplete"
        />
      )}
    </div>
  )
}

export default ProductAutocomplete