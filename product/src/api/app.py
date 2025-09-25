from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger, swag_from
import logging
import os
import sys
from datetime import datetime

# Add the parent directory to sys.path to enable absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.scrapers.captcha_resistant_scraper import CaptchaResistantScraper
from src.config.settings import config

# Setup logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.LOG_FILE),
        logging.StreamHandler()
    ]
)

app = Flask(__name__)
CORS(app)

# Swagger configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": 'apispec',
            "route": '/api/v1/apispec.json',
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/v1/docs/"
}

swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "HS Code Scraper API",
        "description": "A microservice for looking up Harmonized System (HS) codes for products using Singapore's official HS code database.",
        "version": "1.0.0",
        "contact": {
            "name": "HS Code Scraper",
            "email": "support@example.com"
        }
    },
    "host": "localhost:5002",
    "basePath": "/",
    "schemes": ["http", "https"],
    "tags": [
        {
            "name": "Health",
            "description": "Health check endpoints"
        },
        {
            "name": "HS Code Lookup",
            "description": "HS code lookup and batch processing endpoints"
        }
    ]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint
    ---
    tags:
      - Health
    summary: Check API health status
    description: Returns the health status of the HS Code Scraper API service
    responses:
      200:
        description: Service is healthy
        schema:
          type: object
          properties:
            status:
              type: string
              example: "healthy"
            service:
              type: string
              example: "HS Code Scraper API"
            timestamp:
              type: string
              format: date-time
              example: "2025-09-14T10:30:00.123456"
        examples:
          application/json:
            status: "healthy"
            service: "HS Code Scraper API"
            timestamp: "2025-09-14T10:30:00.123456"
    """
    return jsonify({
        'status': 'healthy',
        'service': 'HS Code Scraper API',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/v1/hs-code/lookup', methods=['POST'])
def lookup_hs_code():
    """Lookup HS code for a product description
    ---
    tags:
      - HS Code Lookup
    summary: Lookup HS code for a single product
    description: |
      Searches Singapore's official HS code database for the most relevant HS code 
      matching the provided product description. Uses intelligent ranking to prioritize 
      primary products over accessories and parts.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        description: Product query for HS code lookup
        required: true
        schema:
          type: object
          required:
            - query
          properties:
            query:
              type: string
              description: Product description to search for
              example: "smartphone"
              minLength: 1
              maxLength: 200
    responses:
      200:
        description: HS code lookup successful
        schema:
          type: object
          properties:
            query:
              type: string
              example: "smartphone"
            search_timestamp:
              type: string
              format: date-time
              example: "2025-09-13T19:40:21.892157"
            hs_code:
              type: string
              example: "85171300"
            description:
              type: string
              example: "Smartphones (NMB)"
            unit_of_measure:
              type: string
              example: "NMB"
            suggestions:
              type: array
              items:
                type: object
                properties:
                  hs_code:
                    type: string
                    example: "85177921"
                  description:
                    type: string
                    example: "Parts of cellular telephones (NMB)"
                  unit:
                    type: string
                    example: "NMB"
            success:
              type: boolean
              example: true
            error_message:
              type: string
              nullable: true
              example: null
            response_time_ms:
              type: integer
              example: 24167
            source_url:
              type: string
              nullable: true
              example: null
      400:
        description: Bad request - missing or invalid query
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Missing required field: query"
            example:
              type: object
              properties:
                query:
                  type: string
                  example: "Apple iPhone smartphone"
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Internal server error"
            message:
              type: string
              example: "Scraping service temporarily unavailable"
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'error': 'Missing required field: query',
                'example': {'query': 'Apple iPhone smartphone'}
            }), 400
        
        query = data['query'].strip()
        if not query:
            return jsonify({
                'error': 'Query cannot be empty'
            }), 400
        
        # Perform HS code lookup
        with CaptchaResistantScraper() as scraper:
            result = scraper.scrape_with_retry(query)
        
        return jsonify(result.to_dict())
        
    except Exception as e:
        logging.error(f"Error in HS code lookup: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/v1/hs-code/batch', methods=['POST'])
def batch_lookup_hs_code():
    """Batch lookup HS codes for multiple product descriptions
    ---
    tags:
      - HS Code Lookup
    summary: Lookup HS codes for multiple products in a single request
    description: |
      Performs HS code lookups for multiple product descriptions in a single API call.
      More efficient than making multiple individual requests. Limited to 10 queries per batch.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        description: Array of product queries for batch HS code lookup
        required: true
        schema:
          type: object
          required:
            - queries
          properties:
            queries:
              type: array
              description: Array of product descriptions to search for
              minItems: 1
              maxItems: 10
              items:
                type: string
                minLength: 1
                maxLength: 200
              example: ["smartphone", "tablet", "running shoes"]
    responses:
      200:
        description: Batch HS code lookup successful
        schema:
          type: object
          properties:
            results:
              type: array
              items:
                type: object
                properties:
                  query:
                    type: string
                    example: "smartphone"
                  search_timestamp:
                    type: string
                    format: date-time
                    example: "2025-09-14T02:38:21.185652"
                  hs_code:
                    type: string
                    example: "85171300"
                  description:
                    type: string
                    example: "Smartphones (NMB)"
                  unit_of_measure:
                    type: string
                    example: "NMB"
                  suggestions:
                    type: array
                    items:
                      type: object
                      properties:
                        hs_code:
                          type: string
                          example: "85177921"
                        description:
                          type: string
                          example: "Parts of cellular telephones (NMB)"
                        unit:
                          type: string
                          example: "NMB"
                  success:
                    type: boolean
                    example: true
                  error_message:
                    type: string
                    nullable: true
                    example: null
                  response_time_ms:
                    type: integer
                    example: 25660
                  source_url:
                    type: string
                    nullable: true
                    example: null
            total_processed:
              type: integer
              example: 3
      400:
        description: Bad request - missing queries or batch too large
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Maximum 10 queries allowed per batch"
            example:
              type: object
              properties:
                queries:
                  type: array
                  items:
                    type: string
                  example: ["Apple iPhone", "Samsung Galaxy"]
      500:
        description: Internal server error
        schema:
          type: object
          properties:
            error:
              type: string
              example: "Internal server error"
            message:
              type: string
              example: "Batch processing failed"
    """
    try:
        data = request.get_json()
        
        if not data or 'queries' not in data:
            return jsonify({
                'error': 'Missing required field: queries',
                'example': {'queries': ['Apple iPhone', 'Samsung Galaxy']}
            }), 400
        
        queries = data['queries']
        if not isinstance(queries, list) or len(queries) == 0:
            return jsonify({
                'error': 'Queries must be a non-empty list'
            }), 400
        
        if len(queries) > 10:  # Limit batch size
            return jsonify({
                'error': 'Maximum 10 queries allowed per batch'
            }), 400
        
        results = []
        
        with CaptchaResistantScraper() as scraper:
            for query in queries:
                if query and query.strip():
                    result = scraper.scrape_with_retry(query.strip())
                    results.append(result.to_dict())
                else:
                    results.append({
                        'query': query,
                        'success': False,
                        'error_message': 'Empty query'
                    })
        
        return jsonify({
            'results': results,
            'total_processed': len(results)
        })
        
    except Exception as e:
        logging.error(f"Error in batch HS code lookup: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/docs', methods=['GET'])
@app.route('/api/docs', methods=['GET'])
def docs_redirect():
    """Redirect to API documentation
    ---
    tags:
      - Documentation
    summary: Redirect to Swagger UI documentation
    description: Redirects to the interactive Swagger UI documentation
    responses:
      302:
        description: Redirect to Swagger UI
    """
    from flask import redirect
    return redirect('/api/v1/docs/')

@app.route('/', methods=['GET'])
def root():
    """API root endpoint
    ---
    tags:
      - Documentation
    summary: API information and links
    description: Provides basic API information and links to documentation
    responses:
      200:
        description: API information
        schema:
          type: object
          properties:
            service:
              type: string
              example: "HS Code Scraper API"
            version:
              type: string
              example: "1.0.0"
            description:
              type: string
              example: "A microservice for looking up Harmonized System (HS) codes"
            documentation:
              type: string
              example: "/api/v1/docs/"
            health_check:
              type: string
              example: "/health"
            endpoints:
              type: object
              properties:
                single_lookup:
                  type: string
                  example: "POST /api/v1/hs-code/lookup"
                batch_lookup:
                  type: string
                  example: "POST /api/v1/hs-code/batch"
    """
    return jsonify({
        'service': 'HS Code Scraper API',
        'version': '1.0.0',
        'description': 'A microservice for looking up Harmonized System (HS) codes for products',
        'documentation': '/api/v1/docs/',
        'health_check': '/health',
        'endpoints': {
            'single_lookup': 'POST /api/v1/hs-code/lookup',
            'batch_lookup': 'POST /api/v1/hs-code/batch'
        },
        'data_source': 'Singapore HS Code Database (https://hscodechecker.gobusiness.gov.sg/)'
    })

if __name__ == '__main__':
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    app.run(
        host=os.getenv('FLASK_HOST', '0.0.0.0'),
        port=int(os.getenv('FLASK_PORT', '5002')),
        debug=os.getenv('FLASK_ENV') == 'development'
    )
