# HS Code Scraper Microservice API

A REST API microservice for retrieving HS (Harmonized System) codes for products using AI-powered web scraping.

## 🚀 Features

- **Fast Response**: Optimized for 20-45 second response times
- **Intelligent Ranking**: Returns HS codes sorted by frequency (most accurate first)
- **CAPTCHA Resistant**: Advanced browser automation with stealth techniques
- **File Preservation**: Downloaded XLSX files saved to `downloads/hsresults/`
- **Error Handling**: Screenshots for "too many results" errors, no unnecessary retries
- **Multiple Endpoints**: GET/POST options for different use cases

## 📋 API Endpoints

### Health Check
```
GET /health
```
Returns service status and version information.

### Get HS Codes (GET)
```
GET /scrape/{product_name}?max_results=10&include_raw_data=false
```
Returns all HS codes for a product, sorted by frequency.

### Get HS Codes (POST)
```
POST /scrape
Content-Type: application/json

{
  "product_name": "wheat grain",
  "max_results": 10,
  "include_raw_data": false
}
```

### Quick Lookup (Most Common)
```
GET /scrape/{product_name}/most-common
```
Returns only the most frequent HS code for quick automated classification.

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "product_name": "wheat grain",
  "total_results": 3,
  "most_common_hs_code": "1001.99.00",
  "hs_codes": [
    {
      "hs_code": "1001.99.00",
      "description": "Other wheat",
      "frequency": 5,
      "confidence_score": 0.714,
      "unit": "kg",
      "license_required": false,
      "competent_authority": null,
      "ca_product_code": null
    }
  ],
  "processing_time_ms": 23450,
  "timestamp": "2025-09-13T10:30:00",
  "suggestion": "High confidence result found. The first HS code (1001.99.00) appears most frequently."
}
```

### Error Response
```json
{
  "success": false,
  "product_name": "invalid product",
  "total_results": 0,
  "hs_codes": [],
  "processing_time_ms": 5230,
  "timestamp": "2025-09-13T10:30:00",
  "error_message": "Too many results error - rate limited",
  "suggestion": "Try using a more specific product name or include brand/model details"
}
```

## 🛠️ Setup & Installation

### Option 1: Local Development
```bash
# Clone and navigate to directory
cd tariff-hs-scraper

# Install dependencies
pip install -r api_requirements.txt
pip install -r requirements.txt

# Start the service
python start_service.py
```

### Option 2: Docker
```bash
# Build the image
docker build -t hs-scraper-api .

# Run the container
docker run -p 8000:8000 -v ./downloads:/app/downloads hs-scraper-api
```

### Option 3: Manual Start
```bash
# Navigate to API directory
cd src/api

# Start with uvicorn
uvicorn hs_scraper_service:app --host 0.0.0.0 --port 8000
```

## 🧪 Testing the API

### Using the Test Client
```bash
python test_api_client.py
```

### Using curl
```bash
# Health check
curl http://localhost:8000/health

# Get HS codes
curl "http://localhost:8000/scrape/wheat%20grain"

# Quick lookup
curl "http://localhost:8000/scrape/wheat%20grain/most-common"
```

### Using Python requests
```python
import requests

# Get all HS codes
response = requests.get("http://localhost:8000/scrape/wheat grain")
data = response.json()

if data['success']:
    most_common = data['most_common_hs_code']
    all_codes = data['hs_codes']
    print(f"Most common: {most_common}")
```

## 🔗 Integration Examples

### E-commerce Product Classification
```python
import requests

class ProductClassifier:
    def __init__(self):
        self.api_url = "http://localhost:8000"
    
    def classify_product(self, product_name):
        """Get most likely HS code for a product"""
        response = requests.get(f"{self.api_url}/scrape/{product_name}/most-common")
        
        if response.status_code == 200:
            return response.json()['hs_code']
        else:
            return None
    
    def get_classification_options(self, product_name, max_options=5):
        """Get multiple HS code options for manual selection"""
        response = requests.get(
            f"{self.api_url}/scrape/{product_name}",
            params={"max_results": max_options}
        )
        
        if response.status_code == 200:
            data = response.json()
            return [(hc['hs_code'], hc['confidence_score']) for hc in data['hs_codes']]
        else:
            return []

# Usage
classifier = ProductClassifier()
hs_code = classifier.classify_product("cotton t-shirt")
options = classifier.get_classification_options("electronics device", 3)
```

### Batch Processing
```python
def process_product_batch(products):
    """Process multiple products efficiently"""
    results = []
    
    for product in products:
        response = requests.get(f"http://localhost:8000/scrape/{product}/most-common")
        
        if response.status_code == 200:
            data = response.json()
            results.append({
                'product': product,
                'hs_code': data['hs_code'],
                'confidence': data['confidence_score']
            })
        else:
            results.append({
                'product': product,
                'hs_code': None,
                'error': response.json().get('detail', 'Unknown error')
            })
    
    return results
```

## 🎯 Usage Recommendations

### For Automated Systems
- Use `/scrape/{product}/most-common` for single, high-confidence results
- Implement retry logic with exponential backoff for rate limiting
- Cache results for frequently queried products

### For User-Facing Applications
- Use `/scrape/{product}` to show multiple options
- Display confidence scores to help users choose
- Provide fallback manual entry for failed classifications

### For Data Processing Pipelines
- Batch process products with delays between requests
- Store all results (including XLSX files) for audit trails
- Monitor processing times and adjust timeouts accordingly

## ⚡ Performance & Optimization

### Response Times
- **Quick lookup**: ~20-30 seconds
- **Full results**: ~30-45 seconds
- **Rate limited**: ~5 seconds (with error message)

### File Management
- XLSX files preserved in `downloads/hsresults/`
- Screenshots saved for "too many results" errors
- Automatic cleanup of temporary files

### Scaling Considerations
- Single-threaded scraping (browser limitation)
- Consider horizontal scaling with load balancer
- Monitor memory usage for long-running instances

## 🔧 Configuration

### Environment Variables
```bash
# API settings
PORT=8000
HOST=0.0.0.0

# Chrome options (for Docker)
CHROME_OPTIONS="--headless --no-sandbox --disable-dev-shm-usage"

# File paths
DOWNLOAD_DIR="./downloads"
HSRESULTS_DIR="./downloads/hsresults"
```

### Timeouts & Limits
- Download timeout: 20 seconds
- AI response timeout: 45 seconds
- Max results per query: 50 (configurable)
- Request timeout: 2 minutes

## 📁 File Structure
```
src/api/
├── hs_scraper_service.py     # Main FastAPI application
├── requirements.txt          # API dependencies
└── test_api_client.py       # Test client and examples

downloads/
└── hsresults/               # Preserved XLSX files
    ├── 20250913_143052_wheat_grain_results.xlsx
    └── HSCODE_RESULTS (1).png  # Error screenshots
```

## 🚨 Error Handling

### Common Errors
- **Rate Limited**: "Too many results" - try more specific product names
- **CAPTCHA**: Temporary blocking - retry after a few minutes  
- **Timeout**: Network/processing issues - check service health
- **Not Found**: No HS codes found - try alternative product descriptions

### Error Recovery
- Screenshots automatically saved for "too many results"
- No retry attempts for documented errors
- Fresh browser sessions prevent accumulation of issues

## 📞 API Support

### Interactive Documentation
Visit `http://localhost:8000/docs` for Swagger UI with interactive testing.

### Monitoring
- Health endpoint: `/health`
- Processing times included in all responses
- Error messages with suggested actions

---

**Ready to integrate HS code classification into your microservices architecture!** 🎯
