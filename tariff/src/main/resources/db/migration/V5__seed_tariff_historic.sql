-- V5_historic_tariff_seed.sql
-- Purpose: copy all 2025 rules into 2023 and 2024 year windows, unchanged except for dates.

BEGIN;

WITH base AS (
  SELECT hs_code, importer_id, exporter_id, tariff_type, tariff_rate
  FROM tariff
  WHERE start_date = DATE '2025-01-01'
    AND end_date   = DATE '2105-01-01'
)
INSERT INTO tariff (hs_code, importer_id, exporter_id, tariff_type, tariff_rate, start_date, end_date)
SELECT b.hs_code,
       b.importer_id,
       b.exporter_id,
       b.tariff_type,
       b.tariff_rate,
       d.start_date,
       d.end_date
FROM base b
CROSS JOIN (
  VALUES (DATE '2023-01-01', DATE '2023-12-31'),
         (DATE '2024-01-01', DATE '2024-12-31')
) AS d(start_date, end_date)
WHERE NOT EXISTS (
  SELECT 1
  FROM tariff t
  WHERE t.hs_code      = b.hs_code
    AND t.importer_id  = b.importer_id
    AND t.exporter_id  = b.exporter_id
    AND t.tariff_type  = b.tariff_type
    AND t.tariff_rate  = b.tariff_rate
    AND t.start_date   = d.start_date
    AND t.end_date     = d.end_date
);

COMMIT;

-- Optional verification
-- SELECT start_date, end_date, COUNT(*) FROM tariff
-- WHERE (start_date, end_date) IN (('2023-01-01','2023-12-31'),('2024-01-01','2024-12-31'))
-- GROUP BY 1,2 ORDER BY 1;
