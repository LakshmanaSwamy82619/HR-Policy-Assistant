"""
Escalation tool.

NOTE: the make_escalation_tool() wrapper below (a real LangChain @tool) is
currently UNUSED by app/agent/graph.py, for the same gateway-limitation
reason documented in hris_tool.py - create_escalation_ticket() is called
directly instead. Kept for future use with a tool-calling-capable gateway.
"""
import uuid

from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import EscalationTicket


async def create_escalation_ticket(
    db: AsyncSession,
    employee_id: uuid.UUID,
    conversation_id: uuid.UUID,
    reason: str,
    topic_category: str | None = None,
    pipeline_trace: dict | None = None,
    langsmith_run_id: str | None = None,
    langsmith_trace_url: str | None = None,
) -> EscalationTicket:
    """pipeline_trace/langsmith_* are an optional snapshot of what the agent
    was doing right when it decided to escalate (predicted intent, retrieval
    scores vs. confidence threshold, routing decision, and - when LangSmith
    tracing is on - a link straight into the full trace). Callers that don't
    have this yet (e.g. the manual escalate_to_hr tool below, or an
    employee self-escalating with no agent run behind it) simply omit it."""
    ticket = EscalationTicket(
        id=uuid.uuid4(),
        employee_id=employee_id,
        conversation_id=conversation_id,
        reason=reason,
        topic_category=topic_category,
        status="open",
        pipeline_trace=pipeline_trace,
        langsmith_run_id=langsmith_run_id,
        langsmith_trace_url=langsmith_trace_url,
    )
    db.add(ticket)
    await db.flush()
    return ticket


def make_escalation_tool(db: AsyncSession, employee_id: uuid.UUID, conversation_id: uuid.UUID):
    @tool
    async def escalate_to_hr(reason: str, topic_category: str = "") -> str:
        """Escalate this conversation to a human HR representative by creating
        a ticket. Use this when the question is legally sensitive (harassment,
        termination, medical leave) or when you cannot answer confidently from
        policy documents or HRIS data. reason should be either 'sensitive_topic'
        or 'low_confidence'. topic_category is optional, e.g. 'harassment'."""
        ticket = await create_escalation_ticket(
            db, employee_id, conversation_id, reason, topic_category or None,
        )
        return f"TICKET_CREATED:{ticket.id}"

    return escalate_to_hr