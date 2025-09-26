Tariff Service API

Version: v1
Base URL (local): http://localhost:5004
Media type: application/json
Auth: none (development)

Notes

Dates use ISO‐8601 (YYYY-MM-DD).

“Effective” lookups are inclusive of startDate and endDate
(startDate <= date <= endDate).

/effective/by-names depends on Product & Country microservices.

Data Models
TariffResponse
{
  "id": 1,
  "hsCode": "85171300",
  "importerId": 702,
  "exporterId": 156,
  "tariffType": "Ad Valorem",
  "tariffRate": 0.05,
  "specificAmt": null,
  "specificUnit": null,
  "minTariffAmt": 2.00,
  "maxTariffAmt": 50.00,
  "startDate": "2024-01-01",
  "endDate": "2026-12-31"
}

TariffCreateRequest
{
  "hsCode": "85171300",
  "importerId": 702,
  "exporterId": 156,
  "tariffType": "Ad Valorem",
  "tariffRate": 0.05,
  "specificAmt": null,
  "specificUnit": null,
  "minTariffAmt": 2.00,
  "maxTariffAmt": 50.00,
  "startDate": "2024-01-01",
  "endDate": "2026-12-31"
}

EffectiveByNamesRequest
{
  "productName": "smartphone",
  "importerCountryName": "Singapore",
  "exporterCountryName": "China",
  "date": "2025-01-15"
}

Endpoints
1) Create tariff

POST /api/tariffs

Body: TariffCreateRequest

Responses:

201 Created → TariffResponse

400 Bad Request → invalid/ missing fields

cURL

curl -X POST http://localhost:5004/api/tariffs \
  -H "Content-Type: application/json" \
  -d '{
    "hsCode":"85171300","importerId":SG,"exporterId":CN,
    "tariffType":"Ad Valorem","tariffRate":0.05,
    "specificAmt":null,"specificUnit":null,
    "minTariffAmt":2.00,"maxTariffAmt":50.00,
    "startDate":"2024-01-01","endDate":"2026-12-31"
  }'

2) Get one effective tariff (by IDs)

GET /api/tariffs/effective

Query params (all required):

hs_code (string)

importer (string)

exporter (string)

date (ISO date)

Responses:

200 OK → TariffResponse

404 Not Found → no effective record for the combo + date

Example

GET /api/tariffs/effective?hs_code=85171300&importer=SG&exporter=CN&date=2025-01-15

3) Get one effective tariff (by product & country names)

POST /api/tariffs/effective/by-names

Body: EffectiveByNamesRequest

Responses:

200 OK → TariffResponse

404 Not Found → no effective record

502/504 (possible) if upstream Product/Country MS not reachable

Requires Product MS (getHsCodeByProductName) and Country MS (getCountryIdByName) to be available and properly configured via:

country.base-url, product.base-url

curl -X POST http://localhost:5004/api/tariffs/effective/by-names \
  -H "Content-Type: application/json" \
  -d '{"productName":"smartphone","importerCountryName":"Singapore","exporterCountryName":"China","date":"2025-01-01"}'

expected output: 
{
    "id": 1,
    "hsCode": "85171300",
    "importerId": "SG",
    "exporterId": "CN",
    "tariffType": "Specific",
    "tariffRate": null,
    "specificAmt": 5.0,
    "specificUnit": "USD per ton",
    "minTariffAmt": null,
    "maxTariffAmt": null,
    "startDate": "2024-01-01",
    "endDate": "2099-12-31"
}

4) List tariffs by combo (all records regardless of date)

GET /api/tariffs

Query params (all required):

hs_code (string)

importer (string)

exporter (string)

Responses:

200 OK → TariffResponse[] (possibly empty array)

Example

GET /api/tariffs?hs_code=85171300&importer=SG&exporter=CN

5) List tariffs by HS code

GET /api/tariffs/by-hs/{hsCode}

Path param: hsCode

Responses:

200 OK → TariffResponse[] (possibly empty array)

Example

GET /api/tariffs/by-hs/85171300

Status Codes Summary

200 OK – Successful read.

201 Created – Successfully created a tariff.

400 Bad Request – Invalid input (malformed JSON, wrong types, missing required fields).

404 Not Found – No matching tariff (for effective lookup).

5xx – Server or upstream microservice error.

6) List all tariffs

GET /api/tariffs/all

Responses:

200 OK - TariffResponse[] (Successful Read)

Environment & Profiles

local (dev, runs against docker-compose Postgres):

Start DB: docker compose up -d

Run app: .\mvnw spring-boot:run -Dspring-boot.run.profiles=local

docker (containerized app, service bean active if you used @Profile({"local","docker"})):

Build & run:
docker compose build && docker compose up -d

External clients:

country.base-url: http://<country-host>:<port>
product.base-url: http://<product-host>:<port>

Testing Quicklinks

Happy path (effective by IDs):

GET /api/tariffs/effective?hs_code=85171300&importer=SG&exporter=CN&date=2025-01-15


Happy path (by names):

POST /api/tariffs/effective/by-names
{ "productName": "smartphone", "importerCountryName": "Singapore", "exporterCountryName": "China", "date": "2025-01-15" }


Create then read back using the same HS + IDs + date window.