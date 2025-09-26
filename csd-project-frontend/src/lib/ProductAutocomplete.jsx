import React from 'react'
import Select from 'react-select'
import { allProducts, groupedProducts, popularProducts } from './productData'

const ProductAutocomplete = ({ 
  value, 
  onChange, 
  placeholder = "Search and select a product...",
  disabled = false,
  className = ""
}) => {
  // Custom styles for React Select to match Tailwind design
  const customStyles = {
    control: (provided, state) => ({
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
    placeholder: (provided) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '16px'
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#111827',
      fontSize: '16px'
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      zIndex: 9999
    }),
    menuList: (provided) => ({
      ...provided,
      maxHeight: '300px',
      borderRadius: '8px'
    }),
    option: (provided, state) => ({
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
    groupHeading: (provided) => ({
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
    noOptionsMessage: (provided) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '15px',
      padding: '12px 16px'
    }),
    loadingMessage: (provided) => ({
      ...provided,
      color: '#6b7280',
      fontSize: '15px',
      padding: '12px 16px'
    }),
    indicatorSeparator: () => ({
      display: 'none'
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? '#3b82f6' : '#6b7280',
      '&:hover': {
        color: '#3b82f6'
      },
      padding: '8px'
    })
  }

  // Filter function for fast searching
  const filterOption = (option, inputValue) => {
    if (!inputValue) return true
    
    const searchTerm = inputValue.toLowerCase()
    const label = option.label.toLowerCase()
    const category = option.data.category?.toLowerCase() || ''
    
    // Search in product name and category
    return label.includes(searchTerm) || category.includes(searchTerm)
  }

  // Custom option component to show category
  const formatOptionLabel = (option, { context }) => {
    if (context === 'menu') {
      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{option.label}</span>
          <span className="text-xs text-gray-500 mt-0.5">{option.category}</span>
        </div>
      )
    }
    return option.label
  }

  // Show popular products when no search term
  const getOptions = (inputValue) => {
    if (!inputValue || inputValue.length < 2) {
      return [
        {
          label: "Popular Products",
          options: popularProducts
        }
      ]
    }
    return groupedProducts
  }

  return (
    <div className={className}>
      <Select
        value={value}
        onChange={onChange}
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
    </div>
  )
}

export default ProductAutocomplete