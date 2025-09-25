# Production Deployment Guide

## Overview
This HS Code Scraper microservice is now production-ready with environment variable configuration and Docker containerization.

## Quick Start

### 1. Basic Docker Deployment
```bash
# Build the image
docker build -t hs-scraper:latest .

# Run with default production settings
docker run -d --name hs-scraper-prod -p 5002:5002 hs-scraper:latest
```

### 2. Custom Configuration
```bash
# Run with custom environment variables
docker run -d --name hs-scraper-prod \
  -p 5002:5002 \
  -e HEADLESS_MODE=true \
  -e LOG_LEVEL=WARNING \
  -e REQUESTS_PER_MINUTE=30 \
  -e SESSION_TIMEOUT=600 \
  hs-scraper:latest
```

### 3. Docker Compose (Recommended)
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'
services:
  hs-scraper:
    build: .
    ports:
      - "5002:5002"
    environment:
      - HEADLESS_MODE=true
      - LOG_LEVEL=INFO
      - REQUESTS_PER_MINUTE=20
      - REQUESTS_PER_HOUR=100
      - SESSION_TIMEOUT=300
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5002/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Deploy with:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Configuration Options

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `HEADLESS_MODE` | `true` | Run Chrome headless (recommended for production) |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `REQUESTS_PER_MINUTE` | `20` | Rate limiting for respectful scraping |
| `REQUESTS_PER_HOUR` | `100` | Hourly request limit |
| `SESSION_TIMEOUT` | `300` | Browser session timeout (seconds) |
| `SELENIUM_TIMEOUT` | `10` | WebDriver operation timeout |
| `PAGE_LOAD_TIMEOUT` | `30` | Page load timeout |
| `MIN_DELAY` | `1.0` | Minimum delay between requests |
| `MAX_DELAY` | `3.0` | Maximum delay between requests |

### Production Recommendations
- Set `HEADLESS_MODE=true` for server deployment
- Use `LOG_LEVEL=WARNING` or `ERROR` for production to reduce log volume
- Adjust rate limiting based on your usage needs
- Monitor memory usage with Chrome headless mode

## API Endpoints

### Health Check
```bash
curl http://localhost:5002/health
```

### Single HS Code Lookup
```bash
curl -X POST http://localhost:5002/api/v1/hs-code/lookup \
  -H "Content-Type: application/json" \
  -d '{"query": "laptop"}'
```

### Batch Lookup
```bash
curl -X POST http://localhost:5002/api/v1/hs-code/batch \
  -H "Content-Type: application/json" \
  -d '{"queries": ["smartphone", "laptop", "headphones"]}'
```

## Monitoring & Logging

### Container Logs
```bash
# View logs
docker logs hs-scraper-prod

# Follow logs
docker logs -f hs-scraper-prod
```

### Log Files
Logs are written to `/app/logs/scraper.log` inside the container. Mount a volume to persist logs:
```bash
docker run -v ./logs:/app/logs hs-scraper:latest
```

## Scaling & Load Balancing

For high-traffic scenarios:

1. **Horizontal Scaling**: Run multiple container instances
2. **Load Balancer**: Use nginx or cloud load balancer
3. **Rate Limiting**: Adjust per-instance limits accordingly

Example with multiple instances:
```bash
# Instance 1
docker run -d --name hs-scraper-1 -p 8001:5002 hs-scraper:latest

# Instance 2  
docker run -d --name hs-scraper-2 -p 8002:5002 hs-scraper:latest
```

## Security Considerations

1. **Network**: Run in private network, expose only necessary ports
2. **Resources**: Set container memory/CPU limits
3. **Updates**: Regularly update base images and dependencies
4. **Monitoring**: Implement health checks and alerting

## Troubleshooting

### Common Issues
1. **Chrome crashes**: Increase container memory allocation
2. **Rate limiting**: Adjust delay settings if getting blocked
3. **Timeout errors**: Increase timeout values for slow networks

### Debug Mode
For troubleshooting, run with debug logging:
```bash
docker run -e LOG_LEVEL=DEBUG -e HEADLESS_MODE=false hs-scraper:latest
```

## Performance Tuning

### Memory Optimization
- Use `--disable-dev-shm-usage` flag (already included)
- Set container memory limits
- Monitor Chrome memory usage

### Speed Optimization
- Adjust `MIN_DELAY` and `MAX_DELAY` for faster scraping
- Increase `REQUESTS_PER_MINUTE` if website allows
- Use SSD storage for container filesystem

## Support

For issues or questions:
1. Check container logs first
2. Verify environment variable configuration
3. Test with debug mode enabled
4. Monitor resource usage (CPU, memory)
