"""escalation ticket resolution fields

Revision ID: ab8388d3b0f2
Revises: 40e2a340ce57
Create Date: 2026-08-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ab8388d3b0f2'
down_revision: Union[str, Sequence[str], None] = '40e2a340ce57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('escalation_tickets', sa.Column('resolution_note', sa.Text(), nullable=True))
    op.add_column(
        'escalation_tickets',
        sa.Column('resolved_by_id', postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column('escalation_tickets', sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        'escalation_tickets',
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_foreign_key(
        'fk_escalation_tickets_resolved_by_id_employees',
        'escalation_tickets', 'employees',
        ['resolved_by_id'], ['id'],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_escalation_tickets_resolved_by_id_employees', 'escalation_tickets', type_='foreignkey')
    op.drop_column('escalation_tickets', 'updated_at')
    op.drop_column('escalation_tickets', 'resolved_at')
    op.drop_column('escalation_tickets', 'resolved_by_id')
    op.drop_column('escalation_tickets', 'resolution_note')
