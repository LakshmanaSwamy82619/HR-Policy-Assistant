"""
Logging Node.

Separate from Context Manager (which persists the conversation turn for
memory/follow-up purposes). This node's job is the audit/eval trail: a
structured log line per turn capturing what was asked, what route was
predicted vs. actually taken, and what evidence backed the answer - the
shape RAGAS offline evaluation and human audit review both need.

Kept as a distinct function (not folded into context_manager) so it can
be pointed at a different sink later (e.g. a dedicated audit_log table,
an external log aggregator) without touching conversation persistence.
"""
import uuid

from app.core.logging import logger


def log_turn(
    conversation_id: uuid.UUID,
    employee_id: uuid.UUID,
    question: str,
    predicted_intent: str,
    route_taken: str,
    citations: list | None,
    ticket_id: uuid.UUID | None,
) -> None:
    """Emits one structured audit log line per turn. Mismatches between
    predicted_intent and route_taken are flagged - that gap is exactly
    what Tool-Routing Accuracy evaluation is measuring."""
    routing_match = (
        (predicted_intent == "policy" and route_taken == "rag")
        or (predicted_intent == "personal_data" and route_taken == "hris")
        or (predicted_intent == "sensitive" and route_taken == "escalation")
    )

    logger.info(
        "chat_turn",
        extra={
            "conversation_id": str(conversation_id),
            "employee_id": str(employee_id),
            "question": question,
            "predicted_intent": predicted_intent,
            "route_taken": route_taken,
            "routing_match": routing_match,
            "citation_count": len(citations) if citations else 0,
            "ticket_id": str(ticket_id) if ticket_id else None,
        },
    )
