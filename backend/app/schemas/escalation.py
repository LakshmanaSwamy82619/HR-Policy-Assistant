from datetime import datetime
from typing import Any, Optional, Literal
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
    # Snapshot of what the agent was doing at the moment it escalated
    # (predicted intent, retrieval scores vs. confidence threshold, routing
    # decision, stage timings) - admin/HR only, never shown to the employee.
    pipeline_trace: Optional[dict[str, Any]] = None
    langsmith_run_id: Optional[str] = None
    langsmith_trace_url: Optional[str] = None