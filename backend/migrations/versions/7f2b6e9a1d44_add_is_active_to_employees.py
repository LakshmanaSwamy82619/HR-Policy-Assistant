"""add is_active to employees

Revision ID: 7f2b6e9a1d44
Revises: 1c5326905b2b
Create Date: 2026-08-22 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '7f2b6e9a1d44'
down_revision: Union[str, Sequence[str], None] = '1c5326905b2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'employees',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    # server_default only needed to backfill existing rows during this
    # migration - drop it afterward so future inserts must supply a value
    # explicitly via the ORM default instead of relying on the DB default.
    op.alter_column('employees', 'is_active', server_default=None)


def downgrade() -> None:
    op.drop_column('employees', 'is_active')
