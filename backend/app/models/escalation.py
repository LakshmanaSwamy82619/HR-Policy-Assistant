import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class EscalationTicket(Base):
    __tablename__ = "escalation_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("conversations.id"))
    reason: Mapped[str] = mapped_column(String, nullable=False)  # "low_confidence" | "sensitive_topic" | "system_error"
    topic_category: Mapped[str] = mapped_column(String, nullable=True)  # e.g. "harassment"
    status: Mapped[str] = mapped_column(String, default="open")  # open | in_progress | resolved | closed

    # HR/admin resolution - filled in from the admin tickets dashboard once
    # an HR admin actually works the ticket. resolved_by_id is a second,
    # separate FK to employees (distinct from employee_id, the requester)
    # so the same table can represent both sides of the ticket.
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id"), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Snapshot of the pipeline trace (predicted intent, retrieval scores,
    # confidence-threshold check, stage timings - same shape as
    # conversation_turns.debug_trace) taken at the exact moment this ticket
    # was raised, so HR sees why the agent escalated without cross-
    # referencing the conversation separately.
    pipeline_trace: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # LangSmith run id/url for that same turn, when tracing is enabled -
    # lets HR jump straight into the full LangSmith trace (every LLM call,
    # tool call, and intermediate step) for this escalation.
    langsmith_run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    langsmith_trace_url: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    employee = relationship("Employee", back_populates="escalation_tickets", foreign_keys=[employee_id])
    resolved_by = relationship("Employee", foreign_keys=[resolved_by_id])
    messages = relationship(
        "TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at"
    )


class TicketMessage(Base):
    """A single message in a ticket's back-and-forth thread - either side
    (the employee or the HR admin who owns the ticket) can post one, e.g.
    HR asking 'can you name the manager involved?' and the employee
    replying. Distinct from resolution_note, which is the final HR summary
    shown as soon as the ticket is actioned; this is the conversation that
    happens while it's still open/in_progress."""
    __tablename__ = "ticket_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("escalation_tickets.id"))
    sender_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"))
    sender_role: Mapped[str] = mapped_column(String, nullable=False)  # "employee" | "admin"
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    ticket = relationship("EscalationTicket", back_populates="messages")
    sender = relationship("Employee")