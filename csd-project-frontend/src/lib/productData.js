// Comprehensive product categories for tariff calculations
// Organized by major trade categories that commonly face tariffs

export const productCategories = [
  // Electronics & Technology
  {
    category: "Electronics & Technology",
    products: [
      "Smartphones and Mobile Devices",
      "Laptops and Computers",
      "Tablets and E-readers",
      "Television Sets and Displays",
      "Audio Equipment and Headphones",
      "Gaming Consoles and Accessories",
      "Computer Components and Parts",
      "Semiconductors and Microchips",
      "Electronic Components",
      "Cameras and Photography Equipment",
      "Drones and Unmanned Vehicles",
      "Smart Home Devices",
      "Wearable Technology",
      "Electric Vehicle Components",
      "Solar Panels and Energy Equipment"
    ]
  },
  
  // Textiles & Apparel
  {
    category: "Textiles & Apparel",
    products: [
      "Cotton Textiles and Fabrics",
      "Synthetic Textiles and Materials",
      "Clothing and Garments",
      "Footwear and Shoes",
      "Leather Goods and Accessories",
      "Home Textiles and Linens",
      "Carpets and Rugs",
      "Technical Textiles",
      "Yarn and Fibers",
      "Bags and Luggage",
      "Sportswear and Athletic Wear",
      "Children's Clothing",
      "Fashion Accessories",
      "Protective Clothing",
      "Silk Products"
    ]
  },
  
  // Food & Agriculture
  {
    category: "Food & Agriculture",
    products: [
      "Fresh Fruits and Vegetables",
      "Meat and Poultry Products",
      "Dairy Products and Cheese",
      "Grains and Cereals",
      "Processed Food Products",
      "Beverages and Soft Drinks",
      "Wine and Alcoholic Beverages",
      "Coffee and Tea",
      "Spices and Seasonings",
      "Seafood and Fish Products",
      "Nuts and Dried Fruits",
      "Vegetable Oils",
      "Sugar and Sweeteners",
      "Chocolate and Confectionery",
      "Organic Food Products"
    ]
  },
  
  // Automotive
  {
    category: "Automotive",
    products: [
      "Passenger Vehicles",
      "Commercial Vehicles and Trucks",
      "Motorcycles and Scooters",
      "Auto Parts and Components",
      "Tires and Rubber Products",
      "Electric Vehicles",
      "Vehicle Batteries",
      "Engine Components",
      "Automotive Electronics",
      "Vehicle Accessories",
      "Safety Equipment",
      "Transmission Systems",
      "Brake Systems",
      "Lighting Equipment",
      "Navigation Systems"
    ]
  },
  
  // Machinery & Industrial
  {
    category: "Machinery & Industrial",
    products: [
      "Industrial Machinery",
      "Construction Equipment",
      "Agricultural Machinery",
      "Medical Equipment and Devices",
      "Manufacturing Equipment",
      "Power Generation Equipment",
      "Pumps and Compressors",
      "Material Handling Equipment",
      "Machine Tools",
      "Heating and Cooling Systems",
      "Industrial Automation Equipment",
      "Testing and Measurement Instruments",
      "Safety and Security Equipment",
      "Mining Equipment",
      "Printing and Publishing Equipment"
    ]
  },
  
  // Chemicals & Materials
  {
    category: "Chemicals & Materials",
    products: [
      "Petrochemicals and Plastics",
      "Pharmaceutical Products",
      "Cosmetics and Personal Care",
      "Cleaning and Detergent Products",
      "Paints and Coatings",
      "Adhesives and Sealants",
      "Fertilizers and Pesticides",
      "Basic Chemicals",
      "Specialty Chemicals",
      "Rubber and Polymer Materials",
      "Glass and Ceramic Products",
      "Paper and Pulp Products",
      "Wood and Lumber Products",
      "Building Materials",
      "Insulation Materials"
    ]
  },
  
  // Metals & Mining
  {
    category: "Metals & Mining",
    products: [
      "Steel and Iron Products",
      "Aluminum and Aluminum Alloys",
      "Copper and Copper Products",
      "Precious Metals (Gold, Silver)",
      "Rare Earth Elements",
      "Metal Fabrication Products",
      "Wire and Cable Products",
      "Pipes and Tubing",
      "Metal Hardware and Fasteners",
      "Tools and Cutlery",
      "Zinc and Lead Products",
      "Titanium Products",
      "Nickel and Nickel Alloys",
      "Metal Processing Equipment",
      "Scrap Metal and Recycled Materials"
    ]
  },
  
  // Energy & Resources
  {
    category: "Energy & Resources",
    products: [
      "Crude Oil and Petroleum Products",
      "Natural Gas and LNG",
      "Coal and Fossil Fuels",
      "Renewable Energy Equipment",
      "Wind Turbines and Components",
      "Hydroelectric Equipment",
      "Nuclear Fuel and Equipment",
      "Energy Storage Systems",
      "Power Transmission Equipment",
      "Oil and Gas Equipment",
      "Mining and Drilling Equipment",
      "Fuel Additives",
      "Biofuels and Alternative Energy",
      "Grid Infrastructure",
      "Smart Grid Technology"
    ]
  },
  
  // Furniture & Home Goods
  {
    category: "Furniture & Home Goods",
    products: [
      "Wooden Furniture",
      "Office Furniture",
      "Home Appliances",
      "Kitchenware and Cookware",
      "Home Decoration Items",
      "Lighting Fixtures",
      "Bedding and Mattresses",
      "Garden and Outdoor Furniture",
      "Storage and Organization",
      "Bathroom Fixtures",
      "Flooring Materials",
      "Window Treatments",
      "Art and Collectibles",
      "Sporting Goods",
      "Toys and Games"
    ]
  },
  
  // Transportation & Logistics
  {
    category: "Transportation & Logistics",
    products: [
      "Aircraft and Aviation Equipment",
      "Ships and Marine Equipment",
      "Railway Equipment and Parts",
      "Container and Packaging Materials",
      "Logistics and Warehousing Equipment",
      "Navigation and Communication Equipment",
      "Transportation Safety Equipment",
      "Cargo Handling Equipment",
      "Freight and Shipping Services",
      "Airport Ground Equipment",
      "Marine Propulsion Systems",
      "Aviation Electronics",
      "Railway Signaling Equipment",
      "Port Equipment",
      "Transportation Infrastructure"
    ]
  }
]

// Flatten all products into a single searchable array
export const allProducts = productCategories.reduce((acc, category) => {
  const categoryProducts = category.products.map(product => ({
    value: product.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    label: product,
    category: category.category
  }))
  return [...acc, ...categoryProducts]
}, [])

// Group products by category for organized display
export const groupedProducts = productCategories.map(category => ({
  label: category.category,
  options: category.products.map(product => ({
    value: product.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    label: product,
    category: category.category
  }))
}))

// Popular/commonly traded products for quick suggestions
export const popularProducts = [
  "Smartphones and Mobile Devices",
  "Laptops and Computers",
  "Clothing and Garments",
  "Cotton Textiles and Fabrics",
  "Steel and Iron Products",
  "Aluminum and Aluminum Alloys",
  "Passenger Vehicles",
  "Auto Parts and Components",
  "Fresh Fruits and Vegetables",
  "Processed Food Products",
  "Pharmaceutical Products",
  "Medical Equipment and Devices",
  "Solar Panels and Energy Equipment",
  "Industrial Machinery"
].map(product => ({
  value: product.toLowerCase().replace(/[^a-z0-9]/g, '-'),
  label: product,
  category: "Popular"
}))