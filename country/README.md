Country microservice

This is a small Flask microservice that exposes country data from a Postgres database.

Endpoints:
- GET /api/countries -> list countries
- POST /api/countries/seed -> seed countries from CSV (optional JSON body: {"csv_path": "/path/to/file.csv"})

Additional endpoints (added in code):
- GET /api/countries/<id> -> return the full country object for the given numeric id
- GET /api/countries/by-name?name=<name> -> return the full country object for the given name (case-insensitive exact match)
- GET /api/country-relation/current?a=<country_code>&b=<country_code> -> get relationship weight between two countries
- POST /api/country/relations/ -> seed country relations from CSV

Environment:
The service reads DB connection details from `.env` in this folder using python-dotenv. Example keys:

DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME

Optional:
COUNTRY_SEED_CSV - path to a CSV file to seed on startup

App host/port and auto-seed:
- The app runs on 0.0.0.0:5005 by default in development (see `app.py`).
- **Auto-seeding is currently disabled** (commented out in `app.py` lines 288-305).
- Auto-seeding is intended for production deployment - **remember to uncomment for production use**.
- When enabled, the app auto-seeds both countries and relations if tables are empty on startup.
- **Note**: If auto-seeding is enabled for production, consider removing the manual seeding endpoints (`POST /api/countries/seed` and `POST /api/country/relations/`) as they become redundant.

Run (development):

1. Create a virtualenv and install deps:
   python -m venv .venv; .\.venv\Scripts\activate; pip install -r requirements.txt

2. Ensure Postgres is reachable with credentials from `.env`.

3. Run migrations (if using flask-migrate) or simply start for quick testing:
   # If you use Flask-Migrate / Alembic (recommended):
   #   set FLASK_APP=app.py
   #   flask db upgrade
   # Or for quick testing you can start the app directly:
   python app.py

4. To seed using the full CSV shipped with this folder:
   curl -X POST -H "Content-Type: application/json" -d "{\"csv_path\": \"/app/country/countries_full.csv\"}" http://localhost:5005/api/countries/seed

Docker / docker-compose (optional):
- The repository includes a `country/Dockerfile` and a `compose.yml` in the project root. The service exposes port 5005 inside the container and compose maps it to host port 5005 by default.
- Quick start (from project root):
   docker compose -f compose.yml up -d --build country

Notes about the by-name endpoint:
- `GET /api/countries/by-name?name=` performs a case-insensitive exact match using SQL `ILIKE`. That means you should pass the full country name (URL-encoded if it contains spaces). For example: `?name=United%20States`.
- If you want partial / substring matching, the endpoint can be changed to use `ILIKE '%%name%%'` instead; tell me if you prefer that.
