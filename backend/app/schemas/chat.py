from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel


class ChatRequest(BaseModel):
    conversation_id: Optional[UUID] = None
    message: str


class Citation(BaseModel):
    document_title: str
    section_id: str
    section_title: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: UUID
    answer: str
    route_taken: Literal["rag", "hris", "escalation"]
    citations: Optional[list[Citation]] = None
    ticket_id: Optional[UUID] = None


class ConversationHistoryTurn(BaseModel):
    role: str
    content: str
    route_taken: Optional[str] = None
    citation: Optional[list[Citation]] = None


class ConversationHistoryResponse(BaseModel):
    conversation_id: UUID
    turns: list[ConversationHistoryTurn]


class ConversationSummary(BaseModel):
    id: UUID
    title: str
    started_at: datetime
    status: str
    archived_at: Optional[datetime] = None
    restore_request_status: Optional[Literal["pending", "approved", "rejected"]] = None


class RestoreRequestCreate(BaseModel):
    note: Optional[str] = None
