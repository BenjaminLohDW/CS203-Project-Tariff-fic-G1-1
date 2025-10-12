# HS Code Scraper Microservice
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    unzip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor > /usr/share/keyrings/google-chrome-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY api_requirements.txt .
COPY requirements.txt .

# Install Python dependencies
# Install torch first (it's huge and benefits from caching)
# Use PyTorch 2.6.0+ (required by sentence-transformers 2.6.1 for CVE-2025-32434 fix)
RUN pip install --no-cache-dir torch==2.6.0 torchvision==0.21.0 --index-url https://download.pytorch.org/whl/cpu && \
    echo "✅ PyTorch 2.6.0 (CPU) installed"

# Install other dependencies
RUN pip install --no-cache-dir -r api_requirements.txt && \
    echo "✅ API requirements installed"

RUN pip install --no-cache-dir -r requirements.txt && \
    echo "✅ Main requirements installed"

# Copy application code
COPY src/ ./src/
COPY start_service.py ./
COPY build_embeddings.py ./
COPY test_search.py ./

# Copy HS nomenclature data
COPY hs_nomenclature/ ./hs_nomenclature/

# Create directories
RUN mkdir -p /app/downloads/hsresults
RUN mkdir -p /app/logs
RUN mkdir -p /app/hs_nomenclature/embeddings

# Optional: Pre-build embeddings (uncomment if you want embeddings built in image)
# This increases build time by 10-30 minutes but makes container startup faster
# RUN python build_embeddings.py || echo "Warning: Failed to build embeddings"

# Expose port
EXPOSE 5002

# Environment variables - Production defaults
ENV PYTHONPATH=/app
ENV CHROME_OPTIONS="--headless --no-sandbox --disable-dev-shm-usage --disable-gpu"
ENV HEADLESS_MODE=true
ENV LOG_LEVEL=INFO
ENV REQUESTS_PER_MINUTE=20
ENV REQUESTS_PER_HOUR=100
ENV SESSION_TIMEOUT=300

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1

# Run the application
CMD ["python", "start_service.py"]
