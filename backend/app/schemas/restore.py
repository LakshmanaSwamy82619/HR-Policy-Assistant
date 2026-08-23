from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class RestoreRequestResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    conversation_title: str
    employee_id: UUID
    employee_name: str
    employee_email: str
    status: Literal["pending", "approved", "rejected"]
    note: Optional[str] = None
    admin_note: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None


class RestoreRequestActionRequest(BaseModel):
    action: Literal["approve", "reject", "delete"]
    admin_note: Optional[str] = None
