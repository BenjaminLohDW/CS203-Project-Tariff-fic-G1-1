"""
Startup script for HS Code Scraper Microservice
"""
from fastapi import FastAPI
from fastapi.responses import JSONResponse
import os
import sys
import subprocess
import time

app = FastAPI();

@app.get("/health")
async def health_check():
    """Simple health check - just confirms the service is running"""
    return JSONResponse(
        status_code=200,
        content={
            "status": "healthy",
            "service": "product-scraper"
        }
    )

def install_dependencies():
    """Install required dependencies"""
    print("📦 Installing API dependencies...")
    
    try:
        # Install API requirements
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", "api_requirements.txt"
        ])
        print("✅ API dependencies installed successfully")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    
    return True

def check_chrome_driver():
    """Check if Chrome/ChromeDriver is available"""
    print("🔍 Checking Chrome/ChromeDriver availability...")
    
    try:
        # Import here to check if selenium works
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Try to create a driver instance
        driver = webdriver.Chrome(options=chrome_options)
        driver.quit()
        print("✅ Chrome/ChromeDriver is working")
        return True
        
    except Exception as e:
        print(f"⚠️  Chrome/ChromeDriver issue: {e}")
        print("💡 The service will still start, but scraping may fail")
        return True  # Continue anyway, let the service handle errors

def start_service():
    """Start the Flask service"""
    print("🚀 Starting HS Code Scraper Microservice...")
    
    # Set environment variables
    os.environ["PYTHONPATH"] = os.getcwd()
    
    try:
        # Import and run the Flask service
        from src.api.app import app
        app.run(
            host="0.0.0.0",
            port=5002,
            debug=False
        )
        
    except KeyboardInterrupt:
        print("\n🛑 Service stopped by user")
    except Exception as e:
        print(f"❌ Failed to start service: {e}")
        return False
    
    return True

def main():
    print("🎯 HS Code Scraper Microservice Startup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists("src/api/app.py"):
        print("❌ Please run this script from the tariff-hs-scraper directory")
        print("   Current directory:", os.getcwd())
        return
    
    # Install dependencies
    if not install_dependencies():
        print("❌ Dependency installation failed. Exiting.")
        return
    
    # Check Chrome setup
    check_chrome_driver()
    
    # Create directories if they don't exist
    os.makedirs("downloads/hsresults", exist_ok=True)
    
    print("\n📋 Service Information:")
    print("   • API URL: http://localhost:5002")
    print("   • Health Check: http://localhost:5002/health")
    print("   • Endpoints:")
    print("     - POST /api/v1/hs-code/lookup")
    print("     - POST /api/v1/hs-code/batch")
    print()
    
    # Start the service
    start_service()
    

if __name__ == "__main__":
    main()
