"""escalation ticket pipeline trace + langsmith run info

Revision ID: 9d3f7a2c6b41
Revises: 7f2b6e9a1d44
Create Date: 2026-08-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9d3f7a2c6b41'
down_revision: Union[str, Sequence[str], None] = '7f2b6e9a1d44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Snapshot of the pipeline trace at the moment this specific ticket was
    # raised (same shape as conversation_turns.debug_trace) - so HR sees the
    # confidence score / retrieval detail / routing decision that caused
    # the escalation without cross-referencing the conversation.
    op.add_column('escalation_tickets', sa.Column('pipeline_trace', postgresql.JSONB(), nullable=True))
    # LangSmith run id + trace url for that same turn, when tracing is
    # enabled - lets HR open the full trace in LangSmith directly.
    op.add_column('escalation_tickets', sa.Column('langsmith_run_id', sa.String(), nullable=True))
    op.add_column('escalation_tickets', sa.Column('langsmith_trace_url', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('escalation_tickets', 'langsmith_trace_url')
    op.drop_column('escalation_tickets', 'langsmith_run_id')
    op.drop_column('escalation_tickets', 'pipeline_trace')
