import { useState, useCallback } from 'react'

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

interface HsCodeResult {
  rank: number
  score: number
  subheading: string
  subheading_value: string
  heading: string
  heading_value: string
  chapter: string
  chapter_value: string
  scores_breakdown: {
    subheading: number
    heading: number
    chapter: number
  }
}

interface HsCodeSuggestionsProps {
  onHsCodeSelect: (hsCode: string, description: string) => void
  disabled?: boolean
  className?: string
}

const PRODUCT_API_URL = import.meta.env.VITE_PRODUCT_API_URL || 'http://localhost:5002'

const HsCodeSuggestions = ({ 
  onHsCodeSelect, 
  disabled = false,
  className = ""
}: HsCodeSuggestionsProps) => {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<HsCodeResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [selectedHsCode, setSelectedHsCode] = useState<string>('')

  // Debounced search function
  const searchHsCodes = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSuggestions([])
        setError('')
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const response = await fetch(`${PRODUCT_API_URL}/api/v1/hs-code/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            top_k: 10,
            w_sub: 0.7,
            w_head: 0.2,
            w_ch: 0.1
          })
        })

        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`)
        }

        const data = await response.json()
        setSuggestions(data.results || [])
      } catch (err) {
        console.error('Error fetching HS code suggestions:', err)
        setError('Failed to fetch HS code suggestions. Please try again.')
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 500),
    []
  )

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedHsCode('') // Clear selection when typing
    searchHsCodes(value)
  }

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: HsCodeResult) => {
    const fullDescription = `Chapter ${suggestion.chapter}: ${suggestion.chapter_value} → Heading ${suggestion.heading}: ${suggestion.heading_value} → ${suggestion.subheading}: ${suggestion.subheading_value}`
    
    setSelectedHsCode(suggestion.subheading)
    setQuery(fullDescription)
    setSuggestions([]) // Hide suggestions after selection
    
    // Notify parent component
    onHsCodeSelect(suggestion.subheading, fullDescription)
  }

  // Clear selection
  const handleClear = () => {
    setQuery('')
    setSelectedHsCode('')
    setSuggestions([])
    setError('')
    onHsCodeSelect('', '')
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-2">
        <label className="text-sm font-medium text-gray-700">
          HS Code Smart Search
        </label>
        <p className="text-xs text-gray-500 mt-0.5">
          Start typing a product description to get AI-powered HS code suggestions
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="e.g., frozen beef cuts boneless, cotton t-shirt, smartphone..."
          disabled={disabled}
          className={`
            w-full px-4 py-3 pr-10 text-base border-2 rounded-lg transition-colors duration-200
            ${disabled 
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' 
              : selectedHsCode
                ? 'border-green-300 focus:border-green-500 focus:ring-green-500/10 bg-green-50'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500/10'
            }
            focus:outline-none focus:ring-4
          `}
          aria-label="HS Code search input"
        />
        
        {/* Clear button */}
        {query && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Success indicator */}
        {selectedHsCode && !isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Selected HS Code Display */}
      {selectedHsCode && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-semibold text-green-800">
            Selected HS Code: {selectedHsCode}
          </p>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && !selectedHsCode && (
        <div className="mt-2 max-h-96 overflow-y-auto border-2 border-gray-200 rounded-lg shadow-lg bg-white">
          <div className="p-2 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <p className="text-xs font-medium text-gray-600">
              {suggestions.length} HS Code Suggestions (Click to select)
            </p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {suggestions.map((suggestion) => (
              <button
                key={`${suggestion.subheading}-${suggestion.rank}`}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                disabled={disabled}
                className={`
                  w-full text-left p-3 hover:bg-blue-50 transition-colors duration-150
                  ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                  focus:outline-none focus:bg-blue-50
                `}
              >
                {/* Rank and Score */}
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    #{suggestion.rank}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    Match: {(suggestion.score * 100).toFixed(1)}%
                  </span>
                </div>

                {/* Chapter */}
                <div className="mb-1.5">
                  <span className="text-xs font-semibold text-purple-600">Chapter {suggestion.chapter}:</span>
                  <span className="text-xs text-gray-700 ml-1">{suggestion.chapter_value}</span>
                </div>

                {/* Heading */}
                <div className="mb-1.5">
                  <span className="text-xs font-semibold text-indigo-600">Heading {suggestion.heading}:</span>
                  <span className="text-xs text-gray-700 ml-1">{suggestion.heading_value}</span>
                </div>

                {/* Subheading (most specific) */}
                <div className="mb-2">
                  <span className="text-sm font-bold text-blue-700">Subheading {suggestion.subheading}:</span>
                  <span className="text-sm text-gray-900 ml-1 font-medium">{suggestion.subheading_value}</span>
                </div>

                {/* Score breakdown */}
                <div className="flex gap-3 text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>Ch: {(suggestion.scores_breakdown.chapter * 100).toFixed(0)}%</span>
                  <span>Hd: {(suggestion.scores_breakdown.heading * 100).toFixed(0)}%</span>
                  <span>Sub: {(suggestion.scores_breakdown.subheading * 100).toFixed(0)}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results message */}
      {!isLoading && query.length >= 2 && suggestions.length === 0 && !error && !selectedHsCode && (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">
            No HS code suggestions found for "{query}". Try a different product description.
          </p>
        </div>
      )}
    </div>
  )
}

export default HsCodeSuggestions
