import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    summary: Mapped[str] = mapped_column(Text, nullable=True)  # rolling summary for long threads

    # Soft delete: "deleting" a conversation from the employee side only
    # archives it - nothing is ever hard-deleted except via an admin-approved
    # restore_requests decision (see RestoreRequest below).
    status: Mapped[str] = mapped_column(String, default="active")  # active | archived
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    employee = relationship("Employee", back_populates="conversations")
    turns = relationship("ConversationTurn", back_populates="conversation", cascade="all, delete-orphan")
    restore_requests = relationship("RestoreRequest", back_populates="conversation", cascade="all, delete-orphan")


class ConversationTurn(Base):
    __tablename__ = "conversation_turns"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    role: Mapped[str] = mapped_column(String, nullable=False)  # "user" | "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    route_taken: Mapped[str] = mapped_column(String, nullable=True)  # "rag" | "hris" | "escalation"
    retrieved_chunk_ids: Mapped[list] = mapped_column(JSONB, nullable=True)
    citation: Mapped[list] = mapped_column(JSONB, nullable=True)
    debug_trace: Mapped[dict] = mapped_column(JSONB, nullable=True)  # admin-only pipeline trace (timings, retrieval scores, routing)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="turns")


class RestoreRequest(Base):
    """An employee's request to bring an archived conversation back.
    HR/admin reviews these in the same spirit as escalation tickets:
    approve (un-archive), reject (stays archived), or hard-delete (gone
    for good) - so nothing is ever silently and permanently destroyed
    without an explicit admin action."""
    __tablename__ = "restore_requests"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    status: Mapped[str] = mapped_column(String, default="pending")  # pending | approved | rejected
    note: Mapped[str | None] = mapped_column(Text, nullable=True)  # employee's reason for requesting restore
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="restore_requests")
    employee = relationship("Employee", foreign_keys=[employee_id])
    resolved_by = relationship("Employee", foreign_keys=[resolved_by_id])
