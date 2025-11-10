"""seed agreements (22 rows)

Revision ID: 9b35a53f091c
Revises: a9f7c2e1d0b3
Create Date: 2025-10-21 17:27:14.507481
"""
from alembic import op
import sqlalchemy as sa

# If your table uses camelCase columns (importerId/exporterId), set this to True.
USE_CAMEL = False

# revision identifiers, used by Alembic.
revision = '9b35a53f091c'
down_revision = 'a9f7c2e1d0b3'
branch_labels = None
depends_on = None


def _cols():
    if USE_CAMEL:
        return dict(
            importer='importerId',
            exporter='exporterId',
            start='start_date',
            end='end_date',
            kind='kind',
            value='value',
            note='note',
        )
    else:
        return dict(
            importer='importer_id',
            exporter='exporter_id',
            start='start_date',
            end='end_date',
            kind='kind',
            value='value',
            note='note',
        )


def upgrade():
    from decimal import Decimal
    import datetime as dt
    from sqlalchemy import text

    c = _cols()

    # IMPORTANT: adjust the type for "kind" if you actually use a Postgres ENUM.
    # Example:
    # kind_type = sa.Enum('override', 'surcharge', 'multiplier', name='agreement_kind')
    # If not using ENUM, plain String is fine.
    kind_type = sa.String(16)

    agreements = sa.table(
        'agreements',
        sa.column(c['importer'], sa.String(2)),
        sa.column(c['exporter'], sa.String(2)),
        sa.column(c['start'], sa.Date()),
        sa.column(c['end'], sa.Date()),
        sa.column(c['kind'], kind_type),
        sa.column(c['value'], sa.Numeric(10, 4)),
        sa.column(c['note'], sa.String()),
    )

    rows = [
        # CN surcharge windows
        {c['importer']: 'US', c['exporter']: 'CN', c['start']: dt.date(2025, 2, 5),  c['end']: dt.date(2025, 3, 3),  c['kind']: 'surcharge', c['value']: Decimal('0.10'), c['note']: 'Section 301 - 10% surcharge agreement'},
        {c['importer']: 'US', c['exporter']: 'CN', c['start']: dt.date(2025, 3, 4),  c['end']: dt.date(2125, 3, 4),  c['kind']: 'surcharge', c['value']: Decimal('0.20'), c['note']: 'Section 301 - 20% surcharge agreement'},

        # 0% override FTAs
        {c['importer']: 'US', c['exporter']: 'SG', c['start']: dt.date(2012, 1, 1),  c['end']: dt.date(2112, 1, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'USSFTA'},
        {c['importer']: 'US', c['exporter']: 'KR', c['start']: dt.date(2012, 3, 15), c['end']: dt.date(2112, 3, 15), c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'KORUS FTA'},
        {c['importer']: 'US', c['exporter']: 'MX', c['start']: dt.date(2020, 7, 1),  c['end']: dt.date(2120, 7, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'USMCA'},
        {c['importer']: 'US', c['exporter']: 'CA', c['start']: dt.date(2020, 7, 1),  c['end']: dt.date(2120, 7, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'USMCA'},
        {c['importer']: 'US', c['exporter']: 'BH', c['start']: dt.date(2006, 1, 11), c['end']: dt.date(2106, 1, 11), c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Bahrain FTA'},
        {c['importer']: 'US', c['exporter']: 'AU', c['start']: dt.date(2005, 1, 1),  c['end']: dt.date(2105, 1, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'AUSFTA'},
        {c['importer']: 'US', c['exporter']: 'CL', c['start']: dt.date(2004, 1, 1),  c['end']: dt.date(2104, 1, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Chile FTA'},
        {c['importer']: 'US', c['exporter']: 'CO', c['start']: dt.date(2012, 5, 15), c['end']: dt.date(2112, 5, 15), c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Colombia FTA'},
        {c['importer']: 'US', c['exporter']: 'CR', c['start']: dt.date(2009, 1, 1),  c['end']: dt.date(2109, 1, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'CAFTA-DR (Costa Rica)'},
        {c['importer']: 'US', c['exporter']: 'DO', c['start']: dt.date(2007, 3, 1),  c['end']: dt.date(2107, 3, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'CAFTA-DR (Dominican Republic)'},
        {c['importer']: 'US', c['exporter']: 'SV', c['start']: dt.date(2006, 3, 1),  c['end']: dt.date(2106, 3, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'CAFTA-DR (El Salvador)'},
        {c['importer']: 'US', c['exporter']: 'GT', c['start']: dt.date(2006, 7, 1),  c['end']: dt.date(2106, 7, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'CAFTA-DR (Guatemala)'},
        {c['importer']: 'US', c['exporter']: 'HN', c['start']: dt.date(2006, 4, 1),  c['end']: dt.date(2106, 4, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'CAFTA-DR (Honduras)'},
        {c['importer']: 'US', c['exporter']: 'IL', c['start']: dt.date(1985, 9, 1),  c['end']: dt.date(2085, 9, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Israel FTA'},
        {c['importer']: 'US', c['exporter']: 'JO', c['start']: dt.date(2001, 12, 17),c['end']: dt.date(2101, 12, 17), c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Jordan FTA'},
        {c['importer']: 'US', c['exporter']: 'MA', c['start']: dt.date(2006, 1, 1),  c['end']: dt.date(2106, 1, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Morocco FTA'},
        {c['importer']: 'US', c['exporter']: 'NI', c['start']: dt.date(2006, 4, 1),  c['end']: dt.date(2106, 4, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'CAFTA-DR (Nicaragua)'},
        {c['importer']: 'US', c['exporter']: 'OM', c['start']: dt.date(2009, 1, 1),  c['end']: dt.date(2109, 1, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Oman FTA'},
        {c['importer']: 'US', c['exporter']: 'PA', c['start']: dt.date(2012, 10, 31),c['end']: dt.date(2112, 10, 31), c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Panama Trade Promotion Agreement'},
        {c['importer']: 'US', c['exporter']: 'PE', c['start']: dt.date(2009, 2, 1),  c['end']: dt.date(2109, 2, 1),  c['kind']: 'override',  c['value']: Decimal('0.00'), c['note']: 'US-Peru Trade Promotion Agreement'},
    ]

    bind = op.get_bind()

    # Idempotency guard: if any one known row exists, skip the whole seed.
    probe_sql = text(f"""
        SELECT 1
        FROM agreements
        WHERE {c['importer']} = 'US'
          AND {c['exporter']} = 'SG'
          AND {c['start']} = DATE '2012-01-01'
          AND {c['end']}   = DATE '2112-01-01'
          AND {c['kind']}  = 'override'
        LIMIT 1
    """)
    if bind.execute(probe_sql).scalar() is None:
        # Optional: pre-delete conflicting rows to avoid unique-constraint issues.
        # (Useful in dev if table isn't empty but missing our exact probe record.)
        delete_conflicts = text(f"""
            DELETE FROM agreements a
            USING (
                VALUES
                {",".join([
                    f"('US','CN','2025-02-05','2025-03-03','surcharge')",
                    f"('US','CN','2025-03-04','2125-03-04','surcharge')",
                    f"('US','SG','2012-01-01','2112-01-01','override')",
                    f"('US','KR','2012-03-15','2112-03-15','override')",
                    f"('US','MX','2020-07-01','2120-07-01','override')",
                    f"('US','CA','2020-07-01','2120-07-01','override')",
                    f"('US','BH','2006-01-11','2106-01-11','override')",
                    f"('US','AU','2005-01-01','2105-01-01','override')",
                    f"('US','CL','2004-01-01','2104-01-01','override')",
                    f"('US','CO','2012-05-15','2112-05-15','override')",
                    f"('US','CR','2009-01-01','2109-01-01','override')",
                    f"('US','DO','2007-03-01','2107-03-01','override')",
                    f"('US','SV','2006-03-01','2106-03-01','override')",
                    f"('US','GT','2006-07-01','2106-07-01','override')",
                    f"('US','HN','2006-04-01','2106-04-01','override')",
                    f"('US','IL','1985-09-01','2085-09-01','override')",
                    f"('US','JO','2001-12-17','2101-12-17','override')",
                    f"('US','MA','2006-01-01','2106-01-01','override')",
                    f"('US','NI','2006-04-01','2106-04-01','override')",
                    f"('US','OM','2009-01-01','2109-01-01','override')",
                    f"('US','PA','2012-10-31','2112-10-31','override')",
                    f"('US','PE','2009-02-01','2109-02-01','override')"
                ])}
            ) AS v(importer, exporter, start_date, end_date, kind)
            WHERE a.{c['importer']} = v.importer
              AND a.{c['exporter']} = v.exporter
              AND a.{c['start']}    = v.start_date::date
              AND a.{c['end']}      = v.end_date::date
              AND a.{c['kind']}     = v.kind
        """)
        bind.execute(delete_conflicts)

        # Insert fresh
        op.bulk_insert(agreements, rows)


def downgrade():
    from sqlalchemy import text
    c = _cols()
    bind = op.get_bind()

    # Delete exactly the 22 rows we inserted.
    delete_sql = text(f"""
        DELETE FROM agreements a
        USING (
            VALUES
            ('US','CN','2025-02-05','2025-03-03','surcharge'),
            ('US','CN','2025-03-04','2125-03-04','surcharge'),
            ('US','SG','2012-01-01','2112-01-01','override'),
            ('US','KR','2012-03-15','2112-03-15','override'),
            ('US','MX','2020-07-01','2120-07-01','override'),
            ('US','CA','2020-07-01','2120-07-01','override'),
            ('US','BH','2006-01-11','2106-01-11','override'),
            ('US','AU','2005-01-01','2105-01-01','override'),
            ('US','CL','2004-01-01','2104-01-01','override'),
            ('US','CO','2012-05-15','2112-05-15','override'),
            ('US','CR','2009-01-01','2109-01-01','override'),
            ('US','DO','2007-03-01','2107-03-01','override'),
            ('US','SV','2006-03-01','2106-03-01','override'),
            ('US','GT','2006-07-01','2106-07-01','override'),
            ('US','HN','2006-04-01','2106-04-01','override'),
            ('US','IL','1985-09-01','2085-09-01','override'),
            ('US','JO','2001-12-17','2101-12-17','override'),
            ('US','MA','2006-01-01','2106-01-01','override'),
            ('US','NI','2006-04-01','2106-04-01','override'),
            ('US','OM','2009-01-01','2109-01-01','override'),
            ('US','PA','2012-10-31','2112-10-31','override'),
            ('US','PE','2009-02-01','2109-02-01','override')
        ) AS v(importer, exporter, start_date, end_date, kind)
        WHERE a.{c['importer']} = v.importer
          AND a.{c['exporter']} = v.exporter
          AND a.{c['start']}    = v.start_date::date
          AND a.{c['end']}      = v.end_date::date
          AND a.{c['kind']}     = v.kind
    """)
    bind.execute(delete_sql)
