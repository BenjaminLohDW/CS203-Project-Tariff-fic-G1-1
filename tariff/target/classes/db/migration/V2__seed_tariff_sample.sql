-- src/main/resources/db/migration/V2__seed_tariff_sample.sql
INSERT INTO tariff (hs_code, importer_id, exporter_id, tariff_type, specific_amt, specific_unit, start_date, end_date)
VALUES('85171300', 'SG', 'CN', 'Specific', 5.00, 'USD per unit', DATE '2024-01-01', DATE '2099-12-31');