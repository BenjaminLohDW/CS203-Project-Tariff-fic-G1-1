-- Smartphone (HS 851713) tariff records, US importing from South Korea
INSERT INTO tariff (hs_code, importer_id, exporter_id, tariff_type, tariff_rate, start_date, end_date)
VALUES 
('851713', 'US', 'KR', 'Ad Valorem', 2.5, DATE '2023-01-01', DATE '2023-12-31'),
('851713', 'US', 'KR', 'Ad Valorem', 3.4, DATE '2024-01-01', DATE '2024-12-31'),
('851713', 'US', 'KR', 'Ad Valorem', 4.2, DATE '2025-01-01', DATE '2025-12-31');
