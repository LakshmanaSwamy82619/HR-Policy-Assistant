"""pipeline trace, archive, ticket thread, restore requests

Revision ID: 1c5326905b2b
Revises: ab8388d3b0f2
Create Date: 2026-08-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1c5326905b2b'
down_revision: Union[str, Sequence[str], None] = 'ab8388d3b0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # --- Admin-only pipeline trace on assistant turns ---
    op.add_column('conversation_turns', sa.Column('debug_trace', postgresql.JSONB(), nullable=True))

    # --- Soft-delete/archive on conversations ---
    op.add_column(
        'conversations',
        sa.Column('status', sa.String(), nullable=False, server_default='active'),
    )
    op.add_column('conversations', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))

    # --- Two-way ticket conversation thread ---
    op.create_table(
        'ticket_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ticket_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sender_role', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['ticket_id'], ['escalation_tickets.id']),
        sa.ForeignKeyConstraint(['sender_id'], ['employees.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # --- Restore requests for archived conversations ---
    op.create_table(
        'restore_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('employee_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('admin_note', sa.Text(), nullable=True),
        sa.Column('resolved_by_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id']),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id']),
        sa.ForeignKeyConstraint(['resolved_by_id'], ['employees.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('restore_requests')
    op.drop_table('ticket_messages')
    op.drop_column('conversations', 'archived_at')
    op.drop_column('conversations', 'status')
    op.drop_column('conversation_turns', 'debug_trace')
