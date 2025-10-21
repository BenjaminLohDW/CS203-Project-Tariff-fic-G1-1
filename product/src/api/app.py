from flask import Flask, request, jsonify
from flask_cors import CORS
from flasgger import Swagger, swag_from
import logging
import os
import sys
import tempfile
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List
from datetime import datetime

# Add the parent directory to sys.path to enable absolute imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from src.scrapers.captcha_resistant_scraper import CaptchaResistantScraper
from src.config.settings import config
from src.models.hs_search_engine import HSSearchEngine

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

# Initialize HS Search Engine (lazy initialization)
search_engine = None

def get_search_engine():
    """Get or initialize the search engine singleton"""
    global search_engine
    if search_engine is None:
        search_engine = HSSearchEngine()
        try:
            search_engine.initialize()
        except Exception as e:
            logging.error(f"Failed to initialize search engine: {e}")
            # Don't fail the entire app if search engine fails
            logging.warning("Search endpoints will be unavailable")
    return search_engine

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
        },
        {
            "name": "HS Code Search",
            "description": "Semantic search for HS codes using AI-powered hybrid search"
        }
    ]
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

def _parse_max_workers():
  try:
    value = int(os.getenv('BATCH_MAX_WORKERS', '5'))
    return value if value > 0 else 1
  except (TypeError, ValueError):
    logging.warning('Invalid BATCH_MAX_WORKERS value; defaulting to 1 (sequential).')
    return 1


BATCH_MAX_WORKERS = _parse_max_workers()


def _lookup_single_query(query: str):
  """
  Lookup a single query with its own isolated download directory.
  This prevents race conditions when multiple workers run concurrently.
  """
  # Create a unique per-call download directory to avoid cross-worker collisions
  download_dir = tempfile.mkdtemp(prefix="hs_results_")
  try:
    with CaptchaResistantScraper(download_dir=download_dir) as scraper:
      return scraper.scrape_with_retry(query)
  finally:
    # Best-effort cleanup: remove temp dir if empty (scraper moves files to hsresults)
    try:
      if os.path.exists(download_dir) and not os.listdir(download_dir):
        shutil.rmtree(download_dir)
    except Exception:
      pass

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

        results: List[Any] = [None] * len(queries)

        if BATCH_MAX_WORKERS <= 1:
            with CaptchaResistantScraper() as scraper:
                for idx, query in enumerate(queries):
                    trimmed = query.strip() if isinstance(query, str) else ''
                    if trimmed:
                        result = scraper.scrape_with_retry(trimmed)
                        results[idx] = result.to_dict()
                    else:
                        results[idx] = {
                            'query': query,
                            'success': False,
                            'error_message': 'Empty query'
                        }
        else:
            futures: Dict[Any, Any] = {}
            with ThreadPoolExecutor(max_workers=BATCH_MAX_WORKERS) as executor:
                for idx, query in enumerate(queries):
                    trimmed = query.strip() if isinstance(query, str) else ''
                    if not trimmed:
                        results[idx] = {
                            'query': query,
                            'success': False,
                            'error_message': 'Empty query'
                        }
                        continue
                    futures[executor.submit(_lookup_single_query, trimmed)] = (idx, trimmed)

                for future in as_completed(futures):
                    idx, trimmed_query = futures[future]
                    try:
                        result = future.result()
                        results[idx] = result.to_dict()
                    except Exception as exc:  # noqa: BLE001
                        logging.error('Batch lookup failed for query "%s": %s', trimmed_query, exc)
                        results[idx] = {
                            'query': trimmed_query,
                            'success': False,
                            'error_message': str(exc)
                        }

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

@app.route('/api/v1/hs-code/search', methods=['POST'])
def search_hs_codes():
    """Semantic search for HS codes using AI
    ---
    tags:
      - HS Code Search
    summary: AI-powered semantic search for HS codes
    description: |
      Performs hybrid semantic search across the entire HS code hierarchy using AI embeddings.
      Returns the most relevant HS codes based on product description, with hierarchical scoring
      that considers chapters, headings, and subheadings. Much faster than web scraping and
      provides better semantic understanding of product descriptions.
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        description: Search query and parameters
        required: true
        schema:
          type: object
          required:
            - query
          properties:
            query:
              type: string
              description: Product description to search for
              example: "frozen beef cuts boneless"
              minLength: 1
            top_k:
              type: integer
              description: Number of results to return (1-50)
              example: 10
              default: 10
              minimum: 1
              maximum: 50
            w_sub:
              type: number
              format: float
              description: Weight for subheading similarity (0-1)
              example: 0.7
              default: 0.7
            w_head:
              type: number
              format: float
              description: Weight for heading similarity (0-1)
              example: 0.2
              default: 0.2
            w_ch:
              type: number
              format: float
              description: Weight for chapter similarity (0-1)
              example: 0.1
              default: 0.1
    responses:
      200:
        description: Search completed successfully
        schema:
          type: object
          properties:
            query:
              type: string
              example: "frozen beef cuts boneless"
            results:
              type: array
              items:
                type: object
                properties:
                  rank:
                    type: integer
                    example: 1
                  score:
                    type: number
                    format: float
                    example: 0.8542
                  subheading:
                    type: string
                    example: "020230"
                  subheading_value:
                    type: string
                    example: "Frozen, boneless"
                  heading:
                    type: string
                    example: "0202"
                  heading_value:
                    type: string
                    example: "Meat of bovine animals, frozen"
                  chapter:
                    type: string
                    example: "02"
                  chapter_value:
                    type: string
                    example: "Meat and edible meat offal"
                  scores_breakdown:
                    type: object
                    properties:
                      subheading:
                        type: number
                        format: float
                      heading:
                        type: number
                        format: float
                      chapter:
                        type: number
                        format: float
            total_results:
              type: integer
              example: 10
            search_timestamp:
              type: string
              format: date-time
      400:
        description: Invalid request
        schema:
          type: object
          properties:
            error:
              type: string
      503:
        description: Search engine not available
        schema:
          type: object
          properties:
            error:
              type: string
    """
    try:
        data = request.get_json()
        
        if not data or 'query' not in data:
            return jsonify({
                'error': 'Missing required field: query',
                'example': {'query': 'smartphone', 'top_k': 10}
            }), 400
        
        query = data.get('query', '').strip()
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        # Get optional parameters
        top_k = data.get('top_k', 1)
        w_sub = data.get('w_sub', 0.7)
        w_head = data.get('w_head', 0.2)
        w_ch = data.get('w_ch', 0.1)
        
        # Validate parameters
        if not isinstance(top_k, int) or top_k < 1 or top_k > 50:
            return jsonify({'error': 'top_k must be an integer between 1 and 50'}), 400
        
        # Get search engine
        engine = get_search_engine()
        if engine is None or not engine._is_initialized:
            return jsonify({
                'error': 'Search engine not available',
                'message': 'The semantic search engine is not initialized. Please contact support.'
            }), 503
        
        # Perform search
        results = engine.search(
            query=query,
            top_k=top_k,
            w_sub=w_sub,
            w_head=w_head,
            w_ch=w_ch
        )
        
        return jsonify({
            'query': query,
            'results': results,
            'total_results': len(results),
            'search_timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logging.error(f"Error in HS code search: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/api/v1/hs-code/search/stats', methods=['GET'])
def search_engine_stats():
    """Get search engine statistics
    ---
    tags:
      - HS Code Search
    summary: Get search engine information and statistics
    description: Returns information about the search engine status, model details, and database statistics
    responses:
      200:
        description: Statistics retrieved successfully
        schema:
          type: object
          properties:
            initialized:
              type: boolean
              example: true
            model_name:
              type: string
              example: "BAAI/bge-m3"
            device:
              type: string
              example: "cuda:0"
            cuda_available:
              type: boolean
              example: true
            total_chapters:
              type: integer
              example: 98
            total_headings:
              type: integer
              example: 1244
            total_subheadings:
              type: integer
              example: 5387
            embeddings_dir:
              type: string
              example: "hs_nomenclature/embeddings"
    """
    try:
        engine = get_search_engine()
        if engine is None:
            return jsonify({'initialized': False, 'error': 'Search engine not initialized'})
        
        stats = engine.get_stats()
        return jsonify(stats)
        
    except Exception as e:
        logging.error(f"Error getting search engine stats: {str(e)}")
        return jsonify({
            'error': 'Failed to retrieve statistics',
            'message': str(e)
        }), 500

@app.route('/api/v1/hs-code/search/rebuild', methods=['POST'])
def rebuild_search_index():
    """Rebuild search engine embeddings (admin only)
    ---
    tags:
      - HS Code Search
    summary: Force rebuild of search embeddings
    description: |
      Rebuilds all embeddings from the source CSV file. This is a slow operation
      (can take 10-30 minutes) and should only be used when the source data has been updated.
      Requires admin privileges in production.
    responses:
      200:
        description: Rebuild completed successfully
        schema:
          type: object
          properties:
            message:
              type: string
              example: "Search index rebuilt successfully"
            stats:
              type: object
      500:
        description: Rebuild failed
        schema:
          type: object
          properties:
            error:
              type: string
    """
    try:
        logging.info("Rebuilding search engine embeddings...")
        engine = get_search_engine()
        
        if engine is None:
            # Create new engine if none exists
            global search_engine
            search_engine = HSSearchEngine()
            engine = search_engine
        
        # Force rebuild
        engine.initialize(force_rebuild=True)
        
        return jsonify({
            'message': 'Search index rebuilt successfully',
            'stats': engine.get_stats()
        })
        
    except Exception as e:
        logging.error(f"Error rebuilding search index: {str(e)}")
        return jsonify({
            'error': 'Failed to rebuild search index',
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
            'batch_lookup': 'POST /api/v1/hs-code/batch',
            'semantic_search': 'POST /api/v1/hs-code/search',
            'search_stats': 'GET /api/v1/hs-code/search/stats',
            'rebuild_index': 'POST /api/v1/hs-code/search/rebuild'
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
