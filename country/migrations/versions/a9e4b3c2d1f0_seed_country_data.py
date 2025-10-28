"""seed countries and relations from CSVs

Revision ID: a9e4b3c2d1f0
Revises: f147d61fabf8
Create Date: 2025-10-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import os
import csv
from decimal import Decimal
import datetime as dt
from uuid import uuid4


# revision identifiers, used by Alembic.
revision = 'a9e4b3c2d1f0'
down_revision = 'f147d61fabf8'
branch_labels = None
depends_on = None


def upgrade():
    
    # Insert countries from countries_full.csv (if present in package)
    countries_tbl = sa.table(
        'countries',
        sa.column('name', sa.String(200)),
        sa.column('code', sa.String(10)),
    )

    migrations_dir = os.path.dirname(__file__)
    project_dir = os.path.abspath(os.path.join(migrations_dir, '..', '..'))
    countries_csv = os.path.join(project_dir, 'countries_full.csv')
    relations_csv = os.path.join(project_dir, 'country_relations_all.csv')

    country_rows = []
    if os.path.exists(countries_csv):
        with open(countries_csv, newline='', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            for r in reader:
                name = (r.get('name') or r.get('country') or r.get('Name') or '').strip()
                code = (r.get('code') or r.get('iso2') or r.get('ISO2') or '').strip() or None
                if not name:
                    continue
                country_rows.append({'name': name, 'code': code})

    # fallback minimal set if CSV not found (keeps migration deterministic)
    if not country_rows:
        country_rows = [
            {'name': 'United States', 'code': 'US'},
            {'name': 'Singapore', 'code': 'SG'},
            {'name': 'China', 'code': 'CN'},
        ]

    if country_rows:
        op.bulk_insert(countries_tbl, country_rows)

    # Insert country relations if CSV present
    relations_tbl = sa.table(
        'country_relations',
        sa.column('relation_id', sa.String()),
        sa.column('pair_a', sa.String(10)),
        sa.column('pair_b', sa.String(10)),
        sa.column('weight', sa.Numeric(4, 2)),
        sa.column('effective_date', sa.Date()),
    )

    relation_rows = []
    if os.path.exists(relations_csv):
        with open(relations_csv, newline='', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            # Normalize header keys (some CSVs contain a BOM on the first header)
            for raw in reader:
                # strip BOM and whitespace from header keys
                r = { (k.lstrip('\ufeff') if k else k).strip(): v for k, v in raw.items() }
                a = (r.get('country_a') or '').strip().upper()
                b = (r.get('country_b') or '').strip().upper()
                if not a or not b or a == b:
                    continue

                pair_a, pair_b = sorted([a, b])
                try:
                    w = float(r.get('weight', 0.0))
                except Exception:
                    continue
                w = max(min(w, 1.0), -1.0)

                d = (r.get('effective_date') or '').strip() or '1970-01-01'
                # Try multiple common date formats. CSVs may contain MM/DD/YYYY
                eff = None
                for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m-%d-%Y', '%Y/%m/%d'):
                    try:
                        eff = dt.datetime.strptime(d, fmt).date()
                        break
                    except Exception:
                        continue
                if eff is None:
                    # As a last resort, accept ISO parsing (handles YYYY-MM-DD)
                    try:
                        eff = dt.date.fromisoformat(d)
                    except Exception:
                        # skip rows with unparseable dates to avoid bad data
                        continue

                relation_rows.append({
                    'relation_id': str(uuid4()),
                    'pair_a': pair_a,
                    'pair_b': pair_b,
                    'weight': Decimal(str(w)),
                    'effective_date': eff,
                })

    if relation_rows:
        # Use batches if file is large
        batch_size = 500
        for i in range(0, len(relation_rows), batch_size):
            op.bulk_insert(relations_tbl, relation_rows[i:i+batch_size])


def downgrade():
    # No-op downgrade for data migration: safe deletions are application-specific
    # Keeping this empty avoids accidental mass-deletions on downgrade.
    pass
