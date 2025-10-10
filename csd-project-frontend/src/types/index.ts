// Type definitions for App.tsx

export interface Country {
  id: number
  name: string
  code: string
  fullName?: string
}

export interface ProductOption {
  value: string
  label: string
  fullName?: string
  category?: string
  isHsCode?: boolean
}

export interface TariffData {
  id?: string
  originalData?: any
  'Tariff Type': string
  'Tariff amount': string | number
  'Tariff Description'?: string
  toLowerCase?: () => string
  [key: string]: any // Allow additional properties
}

export interface TariffLine {
  type: string
  description: string
  rate: string | number
  amount: string
}

export interface CalculationData {
  id: string | number
  date: string
  productType: string
  quantity: string | number
  cost: string | number
  exportingCountry: string
  importingCountry: string
  totalAmount: string | number
  mode?: string
  status?: string
  timestamp?: string
  tariffRate?: string | number
  baseAmount?: string
  originalApiData?: {
    created_at?: string
  }
  tariffs?: TariffLine[]
  tariffLinesLoaded?: boolean
}

export interface UserProfile {
  name: string
  role: string
  uid?: string
  email?: string
  user_id?: string
}