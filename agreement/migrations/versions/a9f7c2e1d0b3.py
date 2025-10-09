"""add agreements table

Revision ID: a9f7c2e1d0b3
Revises:
Create Date: 2025-10-09 09:58:53.502102
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a9f7c2e1d0b3"
down_revision = "9ea6cada8f42"
branch_labels = None
depends_on = None


def upgrade():
    # --- agreements (matches models.Agreement) ---
    op.create_table(
        "agreements",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("importerId", sa.String(length=2), nullable=False),
        sa.Column("exporterId", sa.String(length=2), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),          # 'override' | 'surcharge' | 'multiplier'
        sa.Column("value", sa.Numeric(10, 4), nullable=False),
        sa.Column("note", sa.String(), nullable=True),
    )

    # individual indexes for importerId/exporterId (index=True in model)
    with op.batch_alter_table("agreements", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_agreements_importerId"), ["importerId"], unique=False)
        batch_op.create_index(batch_op.f("ix_agreements_exporterId"), ["exporterId"], unique=False)
        # composite index matching __table_args__: ix_pair_window
        batch_op.create_index(
            "ix_pair_window",
            ["importerId", "exporterId", "start_date", "end_date"],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table("agreements", schema=None) as batch_op:
        batch_op.drop_index("ix_pair_window")
        batch_op.drop_index(batch_op.f("ix_agreements_exporterId"))
        batch_op.drop_index(batch_op.f("ix_agreements_importerId"))

    op.drop_table("agreements")
