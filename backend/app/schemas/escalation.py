from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel


class EscalationCreateRequest(BaseModel):
    conversation_id: UUID
    reason: Literal["low_confidence", "sensitive_topic", "system_error"]
    topic_category: Optional[str] = None


class TicketMessageCreate(BaseModel):
    message: str


class TicketMessageResponse(BaseModel):
    id: UUID
    sender_role: Literal["employee", "admin"]
    sender_name: str
    message: str
    created_at: datetime


class EscalationResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    status: str
    reason: str
    topic_category: Optional[str] = None
    resolution_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: list[TicketMessageResponse] = []


class EscalationUpdateRequest(BaseModel):
    """Body for PATCH /admin/tickets/{id} - HR/admin actions a ticket."""
    status: Optional[Literal["open", "in_progress", "resolved", "closed"]] = None
    resolution_note: Optional[str] = None


class EscalationAdminResponse(EscalationResponse):
    employee_id: UUID
    employee_name: str
    employee_email: str
    resolved_by_name: Optional[str] = None
