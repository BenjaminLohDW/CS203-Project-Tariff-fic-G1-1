// Product data based on tariff seed data from test_tariffs_import.csv
// These are the actual products available in the tariff database

// Use the ProductOption type from types/index.ts
import { ProductOption } from '../types'

// Products organized by category
export const tariffProducts: ProductOption[] = [
  // Telecommunications Equipment (Chapter 85)
  {
    value: 'smartphones',
    label: 'Smartphones',
    hsCode: '851713',
    category: 'Telecommunications'
  },
  {
    value: 'microphones-loudspeakers',
    label: 'Microphones and Loudspeakers',
    hsCode: '851822',
    category: 'Audio Equipment'
  },
  {
    value: 'headphones',
    label: 'Headphones and Earphones',
    hsCode: '851762',
    category: 'Audio Equipment'
  },
  {
    value: 'monitors',
    label: 'Monitors and Projectors',
    hsCode: '852852',
    category: 'Display Devices'
  },
  
  // Electrical Equipment (Chapter 85)
  {
    value: 'static-converters',
    label: 'Static Converters',
    hsCode: '850440',
    category: 'Electrical Equipment'
  },
  {
    value: 'food-processors',
    label: 'Food Processors and Mixers',
    hsCode: '850980',
    category: 'Home Appliances'
  },
  {
    value: 'burglar-alarms',
    label: 'Burglar or Fire Alarms',
    hsCode: '853120',
    category: 'Security Equipment'
  },
  
  // Computing Equipment (Chapter 84)
  {
    value: 'computers',
    label: 'Automatic Data Processing Machines',
    hsCode: '847130',
    category: 'Computing'
  }
]

// Group products by category for the dropdown
export const groupedTariffProducts = [
  {
    label: 'Telecommunications',
    options: tariffProducts.filter(p => p.category === 'Telecommunications')
  },
  {
    label: 'Audio Equipment',
    options: tariffProducts.filter(p => p.category === 'Audio Equipment')
  },
  {
    label: 'Display Devices',
    options: tariffProducts.filter(p => p.category === 'Display Devices')
  },
  {
    label: 'Electrical Equipment',
    options: tariffProducts.filter(p => p.category === 'Electrical Equipment')
  },
  {
    label: 'Home Appliances',
    options: tariffProducts.filter(p => p.category === 'Home Appliances')
  },
  {
    label: 'Security Equipment',
    options: tariffProducts.filter(p => p.category === 'Security Equipment')
  },
  {
    label: 'Computing',
    options: tariffProducts.filter(p => p.category === 'Computing')
  }
].filter(group => group.options.length > 0) // Only show groups with products
