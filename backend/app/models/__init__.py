# Import all models here so Alembic/Base.metadata can discover every table.
from app.models.employee import Employee
from app.models.hris import HRISRecord
from app.models.policy import PolicyDocument, PolicyChunk
from app.models.conversation import Conversation, ConversationTurn, RestoreRequest
from app.models.escalation import EscalationTicket, TicketMessage

__all__ = [
    "Employee",
    "HRISRecord",
    "PolicyDocument",
    "PolicyChunk",
    "Conversation",
    "ConversationTurn",
    "RestoreRequest",
    "EscalationTicket",
    "TicketMessage",
]
