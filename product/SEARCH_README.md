# HS Code Semantic Search

AI-powered semantic search for HS (Harmonized System) codes using sentence transformers and hybrid hierarchical scoring.

## Features

- 🤖 **AI-Powered**: Uses the BAAI/bge-m3 sentence transformer model for semantic understanding
- 🎯 **Hybrid Scoring**: Combines chapter, heading, and subheading similarities with configurable weights
- ⚡ **Fast**: In-memory vector search with numpy for instant results
- 🔄 **GPU Support**: Automatically uses CUDA if available for faster encoding
- 📊 **Hierarchical**: Returns full HS code hierarchy (chapter → heading → subheading)

## Architecture

### Model
- **Model**: `BAAI/bge-m3` - A multilingual sentence transformer optimized for semantic search
- **Embedding Dimension**: 1024
- **Normalization**: L2 normalized embeddings for cosine similarity

### Search Strategy

The search uses a **hybrid hierarchical approach**:

1. **Chapter Level (weight: 0.1)**: Matches broad product categories
2. **Heading Level (weight: 0.2)**: Matches specific product types
3. **Subheading Level (weight: 0.7)**: Matches detailed product specifications

**Final Score** = `(0.7 × subheading_similarity) + (0.2 × heading_similarity) + (0.1 × chapter_similarity)`

This ensures that results are relevant at all hierarchy levels while prioritizing the most specific matches.

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Required packages:
- `sentence-transformers==2.2.2`
- `torch>=2.0.0`
- `numpy>=1.24.0`
- `pandas>=2.0.0`

### 2. Build Embeddings

Before starting the service, you need to build the embeddings from the HS code CSV:

```bash
cd product
python build_embeddings.py
```

This will:
- Load `hs_nomenclature/chapters_combined.csv`
- Extract chapters, headings, and subheadings
- Encode them using the sentence transformer model
- Save embeddings to `hs_nomenclature/embeddings/`

**Time**: First run takes ~10-30 minutes depending on your hardware (faster with GPU)

**Storage**: Embeddings require ~50-100MB of disk space

### 3. Start the Service

```bash
python start_service.py
```

The service will automatically load the pre-built embeddings on startup.

## API Endpoints

### 1. Semantic Search

**Endpoint**: `POST /api/v1/hs-code/search`

Search for HS codes using natural language product descriptions.

**Request**:
```json
{
  "query": "frozen beef cuts boneless",
  "top_k": 10,
  "w_sub": 0.7,
  "w_head": 0.2,
  "w_ch": 0.1
}
```

**Parameters**:
- `query` (required): Product description
- `top_k` (optional): Number of results (1-50, default: 10)
- `w_sub` (optional): Subheading weight (default: 0.7)
- `w_head` (optional): Heading weight (default: 0.2)
- `w_ch` (optional): Chapter weight (default: 0.1)

**Response**:
```json
{
  "query": "frozen beef cuts boneless",
  "results": [
    {
      "rank": 1,
      "score": 0.8542,
      "subheading": "020230",
      "subheading_value": "Frozen, boneless",
      "heading": "0202",
      "heading_value": "Meat of bovine animals, frozen",
      "chapter": "02",
      "chapter_value": "Meat and edible meat offal",
      "scores_breakdown": {
        "subheading": 0.891,
        "heading": 0.823,
        "chapter": 0.756
      }
    }
  ],
  "total_results": 10,
  "search_timestamp": "2025-10-12T10:30:00.123456"
}
```

### 2. Search Engine Stats

**Endpoint**: `GET /api/v1/hs-code/search/stats`

Get information about the search engine status and database size.

**Response**:
```json
{
  "initialized": true,
  "model_name": "BAAI/bge-m3",
  "device": "cuda:0",
  "cuda_available": true,
  "total_chapters": 98,
  "total_headings": 1244,
  "total_subheadings": 5387,
  "embeddings_dir": "hs_nomenclature/embeddings"
}
```

### 3. Rebuild Index

**Endpoint**: `POST /api/v1/hs-code/search/rebuild`

Force rebuild of search embeddings (admin only). Use this when the source CSV has been updated.

**Response**:
```json
{
  "message": "Search index rebuilt successfully",
  "stats": { ... }
}
```

## Usage Examples

### Python

```python
import requests

# Basic search
response = requests.post('http://localhost:5002/api/v1/hs-code/search', json={
    'query': 'cotton t-shirt mens',
    'top_k': 5
})

results = response.json()
for item in results['results']:
    print(f"{item['rank']}. {item['subheading']} - {item['subheading_value']}")
    print(f"   Score: {item['score']:.4f}")
```

### cURL

```bash
curl -X POST http://localhost:5002/api/v1/hs-code/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "tablet touchscreen computer",
    "top_k": 10
  }'
```

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:5002/api/v1/hs-code/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'smartphone with camera',
    top_k: 10
  })
});

const data = await response.json();
console.log(data.results);
```

## Performance

### Speed
- **First search**: ~100-500ms (model loading + inference)
- **Subsequent searches**: ~10-50ms (cached model)
- **Batch searches**: Linear scaling with GPU

### Accuracy
The hybrid approach provides better results than keyword matching:
- ✅ Understands semantic meaning ("smartphone" matches "mobile phone")
- ✅ Handles synonyms and variations
- ✅ Context-aware (considers full hierarchy)
- ✅ Language-flexible (handles various descriptions)

### Resource Usage
- **Memory**: ~500MB-1GB (model + embeddings)
- **CPU**: Minimal during search (mostly numpy operations)
- **GPU**: Optional but recommended for faster encoding

## Troubleshooting

### Embeddings not found
```
Error: Embeddings not found
```
**Solution**: Run `python build_embeddings.py` first

### CUDA out of memory
```
RuntimeError: CUDA out of memory
```
**Solution**: The model will fall back to CPU automatically. For GPU usage, ensure you have at least 2GB VRAM.

### Slow first search
**Expected**: The first search loads the model into memory. Subsequent searches are much faster.

### Search returns poor results
**Solution**: Try adjusting the weights:
- Increase `w_sub` for more specific matches
- Increase `w_ch` for broader category matches
- Adjust `top_k` to see more/fewer results

## Development

### File Structure
```
product/
├── src/
│   └── models/
│       └── hs_search_engine.py    # Main search engine
├── hs_nomenclature/
│   ├── chapters_combined.csv       # Source data
│   └── embeddings/                 # Generated embeddings
│       ├── chap_embeddings.npy
│       ├── chap_meta.csv
│       ├── head_embeddings.npy
│       ├── head_meta.csv
│       ├── sub_embeddings.npy
│       └── sub_meta.csv
└── build_embeddings.py             # Build script
```

### Updating the Index

When `chapters_combined.csv` is updated:

1. Run the rebuild script:
   ```bash
   python build_embeddings.py
   ```

2. Or use the API endpoint:
   ```bash
   curl -X POST http://localhost:5002/api/v1/hs-code/search/rebuild
   ```

### Testing

```python
from src.models.hs_search_engine import HSSearchEngine

# Initialize
engine = HSSearchEngine()
engine.initialize()

# Test search
results = engine.search("frozen beef", top_k=5)
for r in results:
    print(f"{r['rank']}. {r['score']:.4f} - {r['subheading']}")
```

## Comparison: Search vs Scraping

| Feature | Semantic Search | Web Scraping |
|---------|----------------|--------------|
| Speed | 10-50ms | 5-15 seconds |
| Reliability | 100% uptime | Depends on website |
| Semantic understanding | ✅ Yes | ❌ Limited |
| Offline capable | ✅ Yes | ❌ No |
| Batch processing | ✅ Fast | ❌ Slow |
| Setup complexity | Medium (build embeddings) | Low |
| Maintenance | Low | High (CAPTCHA issues) |

**Recommendation**: Use semantic search for production. Use web scraping as a fallback or for verification.

## License

This implementation uses:
- **BAAI/bge-m3**: MIT License
- **Sentence Transformers**: Apache 2.0 License

## Support

For issues or questions:
1. Check the logs in `logs/`
2. Verify embeddings exist: `ls hs_nomenclature/embeddings/`
3. Check GPU status: `curl http://localhost:5002/api/v1/hs-code/search/stats`
