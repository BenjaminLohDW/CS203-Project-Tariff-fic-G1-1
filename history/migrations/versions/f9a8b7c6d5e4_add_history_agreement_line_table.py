"""add_history_agreement_line_table

Revision ID: f9a8b7c6d5e4
Revises: 8508d4ee43c4
Create Date: 2025-10-21 16:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f9a8b7c6d5e4'
down_revision = '8508d4ee43c4'
branch_labels = None
depends_on = None


def upgrade():
    # Create history_agreement_line table
    op.create_table('history_agreement_line',
    sa.Column('line_id', sa.String(length=36), nullable=False),
    sa.Column('history_id', sa.String(length=36), nullable=False),
    sa.Column('line_order', sa.Integer(), nullable=False),
    sa.Column('kind', sa.String(length=32), nullable=False),
    sa.Column('value_str', sa.String(length=64), nullable=False),
    sa.Column('start_date', sa.String(length=32), nullable=False),
    sa.Column('end_date', sa.String(length=32), nullable=True),
    sa.Column('note', sa.String(length=512), nullable=True),
    sa.ForeignKeyConstraint(['history_id'], ['history.history_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('line_id')
    )
    
    with op.batch_alter_table('history_agreement_line', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_history_agreement_line_history_id'), ['history_id'], unique=False)
        batch_op.create_index('ix_agreement_history_order', ['history_id', 'line_order'], unique=False)


def downgrade():
    with op.batch_alter_table('history_agreement_line', schema=None) as batch_op:
        batch_op.drop_index('ix_agreement_history_order')
        batch_op.drop_index(batch_op.f('ix_history_agreement_line_history_id'))

    op.drop_table('history_agreement_line')
