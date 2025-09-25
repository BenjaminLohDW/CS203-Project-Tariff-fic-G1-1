# Configuration settings for the tariff HS scraper
import os
from dotenv import load_dotenv

# Load .env file if it exists (for local development)
load_dotenv()

class Config:
    # Singapore HS Code Checker URL - Updated to the correct modern site
    HS_CODE_CHECKER_URL = "https://hscodechecker.gobusiness.gov.sg/"
    
    # Scraping settings
    REQUEST_DELAY = float(os.getenv('REQUEST_DELAY', '3'))  # Increased delay for React app loading
    TIMEOUT = int(os.getenv('TIMEOUT', '60'))  # Increased timeout for JavaScript-heavy site
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '3'))  # Maximum number of retries for failed requests
    
    # WebDriver settings for stealth mode
    WEBDRIVER_TIMEOUT = int(os.getenv('WEBDRIVER_TIMEOUT', '60'))  # Increased for React app
    HEADLESS = os.getenv('HEADLESS_MODE', 'true').lower() == 'true'  # Production ready - headless by default
    
    # Stealth settings to avoid detection
    STEALTH_MODE = True
    DISABLE_IMAGES = True  # Faster loading
    DISABLE_CSS = False    # Keep CSS for proper rendering
    WINDOW_SIZE = (1366, 768)  # Common resolution
    
    # Human-like behavior
    HUMAN_TYPING_SPEED = True
    MIN_TYPING_DELAY = 0.1
    MAX_TYPING_DELAY = 0.3
    MOUSE_MOVEMENTS = True
    RANDOM_SCROLLING = True
    
    # User agent for respectful scraping - Updated to latest Chrome
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    # User agents list for compatibility with base scraper - Updated to latest
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    
    # Additional attributes that base scraper might need
    ALLOWED_PATHS = ["/"]
    FORBIDDEN_PATTERNS = ["admin", "login", "private"]
    MIN_DELAY = float(os.getenv('MIN_DELAY', '1.0'))
    MAX_DELAY = float(os.getenv('MAX_DELAY', '3.0'))
    REQUESTS_PER_MINUTE = int(os.getenv('REQUESTS_PER_MINUTE', '20'))
    REQUESTS_PER_HOUR = int(os.getenv('REQUESTS_PER_HOUR', '100'))
    WINDOW_SIZE = (
        int(os.getenv('WINDOW_SIZE_WIDTH', '1920')), 
        int(os.getenv('WINDOW_SIZE_HEIGHT', '1080'))
    )
    IMPLICIT_WAIT = int(os.getenv('IMPLICIT_WAIT', '5'))
    PAGE_LOAD_TIMEOUT = int(os.getenv('PAGE_LOAD_TIMEOUT', '30'))
    SELENIUM_TIMEOUT = int(os.getenv('SELENIUM_TIMEOUT', '10'))
    HEADLESS_MODE = os.getenv('HEADLESS_MODE', 'true').lower() == 'true'
    SESSION_TIMEOUT = int(os.getenv('SESSION_TIMEOUT', '300'))  # 5 minutes session timeout
    
    # Additional common scraper attributes
    MAX_RETRIES_NETWORK = 3
    RETRY_DELAY = 1.0
    ROBOTS_TXT_CACHE_TIMEOUT = 3600
    DEFAULT_CRAWL_DELAY = 1.0
    RESPECT_ROBOTS_TXT = True
    MAX_SESSION_REQUESTS = 100
    BACKOFF_FACTOR = 2.0
    
    # Logging settings
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/scraper.log')

# Create a global config instance
config = Config()
