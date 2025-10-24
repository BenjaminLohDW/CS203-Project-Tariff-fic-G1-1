Country microservice

This is a small Flask microservice that exposes country data from a Postgres database. Schema and initial data are managed exclusively via Alembic migrations.

## API Documentation

**Swagger UI:** Access interactive API documentation at `http://localhost:5005/api/v1/docs/` when the service is running (Swagger is configured at `/api/v1/docs/`).

Endpoints (actual paths exposed by the running service)
- GET / -> Root information + link to docs
- GET /health -> Health check
- GET /countries/all -> List all countries
- GET /countries/<int:country_id> -> Return the full country object for the given numeric id
- GET /countries/by-name?name=<name> -> Return the full country object for the given name (case-insensitive exact match)
- GET /countries/relation/current?a=<country_code>&b=<country_code> -> Get relationship weight between two countries

Environment:
The service reads DB connection details from `.env` in this folder using python-dotenv. Example keys:

DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME

## Quick summary
- Data provisioning: migration-only. All schema and seed data are applied by Alembic migrations.
- CSV assets used by migrations: `countries_full.csv` and `country_relations_all.csv` (copied into the image by the `Dockerfile`).
- Seeding migration: `migrations/versions/a9e4b3c2d1f0_seed_country_data.py`.

## Running locally (development)

1) Create a virtualenv and install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

2) Configure `.env` with Postgres connection details (keys used in the project: `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`).

3) Apply migrations to create schema and seed data:

```powershell
set FLASK_APP=app.py
flask db upgrade
```

4) Start the service:

```powershell
python app.py
```

## Docker / Docker Compose

- The `Dockerfile` copies repository files (including the CSVs) into the image with `COPY . .`.
- The project `compose.yml` runs a one-shot migration container (e.g. `country-migrate`) that executes `flask db upgrade`; this applies schema changes and seeds.

To run the full stack from the project root (integration test):

```powershell
docker compose down -v --remove-orphans
docker compose build --no-cache
docker compose up --build -d
```

## Notes & troubleshooting

- BOM in CSV header: some CSV editors produce a UTF-8 BOM on the first header cell (example: `\ufeffcountry_a`). The migration normalizes headers to handle this; prefer saving CSVs as UTF-8 without BOM to avoid surprises.
- Date formats: `effective_date` values in `country_relations_all.csv` may be `MM/DD/YYYY` (Windows-style) or `YYYY-MM-DD` (ISO). The migration accepts common formats and skips rows with unparseable dates.
- If relations are not present after `flask db upgrade`, confirm the CSV files are present in the container image at `/app/` and check `country-migrate` logs (`docker compose logs country-migrate`).

## Development checklist for maintainers

- Keep `countries_full.csv` and `country_relations_all.csv` inside the `country/` folder and commit changes when you intend the migration to seed new data.
- Run `flask db upgrade` as part of your deployment or CI pipeline to apply schema and seed changes.
- For very large datasets, consider moving CSVs to object storage and implement a dedicated import job instead of shipping huge files in the image.