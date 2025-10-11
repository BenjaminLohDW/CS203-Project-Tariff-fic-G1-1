"""bootstrap placeholder (no-op)

Revision ID: 9ea6cada8f42
Revises:
Create Date: 2025-10-09 00:00:00
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "9ea6cada8f42"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # no-op placeholder to satisfy Alembic graph
    pass

def downgrade():
    # no-op
    pass
