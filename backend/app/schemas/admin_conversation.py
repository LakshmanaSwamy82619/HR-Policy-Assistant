from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class AdminTurnResponse(BaseModel):
    id: UUID
    role: str
    content: str
    route_taken: Optional[str] = None
    citation: Optional[list] = None
    debug_trace: Optional[dict] = None
    created_at: datetime


class AdminConversationSummary(BaseModel):
    id: UUID
    employee_id: UUID
    employee_name: str
    employee_email: str
    title: str
    started_at: datetime
    status: str
    turn_count: int


class AdminConversationMessages(BaseModel):
    conversation_id: UUID
    employee_name: str
    employee_email: str
    turns: list[AdminTurnResponse]
