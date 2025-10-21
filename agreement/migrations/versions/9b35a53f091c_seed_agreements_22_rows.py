"""seed agreements (22 rows)

Revision ID: 9b35a53f091c
Revises: a9f7c2e1d0b3
Create Date: 2025-10-21 17:27:14.507481

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9b35a53f091c'
down_revision = 'a9f7c2e1d0b3'
branch_labels = None
depends_on = None

def upgrade():
    agreements = sa.table(
        'agreements',
        sa.column('importerId', sa.String(2)),
        sa.column('exporterId', sa.String(2)),
        sa.column('start_date', sa.Date()),
        sa.column('end_date', sa.Date()),
        sa.column('kind', sa.String(16)),
        sa.column('value', sa.Numeric(10, 4)),
        sa.column('note', sa.String()),
    )

    from decimal import Decimal
    import datetime as dt

    op.bulk_insert(
        agreements,
        [
            {
                'importerId': 'US',
                'exporterId': 'CN',
                'start_date': dt.date(2025, 2, 5),
                'end_date':   dt.date(2025, 3, 3),
                'kind':  'surcharge',
                'value': Decimal('0.10'),
                'note':  'Section 301 - 10% surcharge agreement',
            },
            {
                'importerId': 'US',
                'exporterId': 'CN',
                'start_date': dt.date(2025, 3, 4),
                'end_date':   dt.date(2125, 3, 4),
                'kind':  'surcharge',
                'value': Decimal('0.20'),
                'note':  'Section 301 - 20% surcharge agreement',
            },
            {
                'importerId': 'US',
                'exporterId': 'SG',
                'start_date': dt.date(2012, 1, 1),
                'end_date':   dt.date(2112, 1, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'USSFTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'KR',
                'start_date': dt.date(2012, 3, 15),
                'end_date':   dt.date(2112, 3, 15),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'KORUS FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'MX',
                'start_date': dt.date(2020, 7, 1),
                'end_date':   dt.date(2120, 7, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'USMCA',
            },
            {
                'importerId': 'US',
                'exporterId': 'CA',
                'start_date': dt.date(2020, 7, 1),
                'end_date':   dt.date(2120, 7, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'USMCA',
            },
            {
                'importerId': 'US',
                'exporterId': 'BH',
                'start_date': dt.date(2006, 1, 11),
                'end_date':   dt.date(2106, 1, 11),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Bahrain FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'AU',
                'start_date': dt.date(2005, 1, 1),
                'end_date':   dt.date(2105, 1, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'AUSFTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'CL',
                'start_date': dt.date(2004, 1, 1),
                'end_date':   dt.date(2104, 1, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Chile FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'CO',
                'start_date': dt.date(2012, 5, 15),
                'end_date':   dt.date(2112, 5, 15),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Colombia FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'CR',
                'start_date': dt.date(2009, 1, 1),
                'end_date':   dt.date(2109, 1, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'CAFTA-DR (Costa Rica)',
            },
            {
                'importerId': 'US',
                'exporterId': 'DO',
                'start_date': dt.date(2007, 3, 1),
                'end_date':   dt.date(2107, 3, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'CAFTA-DR (Dominican Republic)',
            },
            {
                'importerId': 'US',
                'exporterId': 'SV',
                'start_date': dt.date(2006, 3, 1),
                'end_date':   dt.date(2106, 3, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'CAFTA-DR (El Salvador)',
            },
            {
                'importerId': 'US',
                'exporterId': 'GT',
                'start_date': dt.date(2006, 7, 1),
                'end_date':   dt.date(2106, 7, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'CAFTA-DR (Guatemala)',
            },
            {
                'importerId': 'US',
                'exporterId': 'HN',
                'start_date': dt.date(2006, 4, 1),
                'end_date':   dt.date(2106, 4, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'CAFTA-DR (Honduras)',
            },
            {
                'importerId': 'US',
                'exporterId': 'IL',
                'start_date': dt.date(1985, 9, 1),
                'end_date':   dt.date(2085, 9, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Israel FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'JO',
                'start_date': dt.date(2001, 12, 17),
                'end_date':   dt.date(2101, 12, 17),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Jordan FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'MA',
                'start_date': dt.date(2006, 1, 1),
                'end_date':   dt.date(2106, 1, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Morocco FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'NI',
                'start_date': dt.date(2006, 4, 1),
                'end_date':   dt.date(2106, 4, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'CAFTA-DR (Nicaragua)',
            },
            {
                'importerId': 'US',
                'exporterId': 'OM',
                'start_date': dt.date(2009, 1, 1),
                'end_date':   dt.date(2109, 1, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Oman FTA',
            },
            {
                'importerId': 'US',
                'exporterId': 'PA',
                'start_date': dt.date(2012, 10, 31),
                'end_date':   dt.date(2112, 10, 31),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Panama Trade Promotion Agreement',
            },
            {
                'importerId': 'US',
                'exporterId': 'PE',
                'start_date': dt.date(2009, 2, 1),
                'end_date':   dt.date(2109, 2, 1),
                'kind':  'override',
                'value': Decimal('0.00'),
                'note':  'US-Peru Trade Promotion Agreement',
            },
        ]
    )


def downgrade():
    # Remove only the rows we just inserted (safer than truncating)
    op.execute("""
        DELETE FROM agreements
        WHERE (importerId, exporterId, start_date, end_date, kind)
              IN (
                ('US','CN', DATE '2025-02-05', DATE '2025-03-03', 'surcharge'),
                ('US','CN', DATE '2025-03-04', DATE '2125-03-04', 'surcharge'),
                ('US','MX', DATE '2020-07-01', DATE '2120-07-01', 'override')
                -- ... and the rest matching what you inserted ...
              );
    """)

