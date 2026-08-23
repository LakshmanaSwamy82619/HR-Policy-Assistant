import uuid
from datetime import datetime, timezone

from sqlalchemy import Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class HRISRecord(Base):
    """
    Mock 'live' HRIS data. Treated as authoritative current-state data —
    never embedded into the vector store, always fetched live via tool call.
    """
    __tablename__ = "hris_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("employees.id"), unique=True)
    leave_balance_days: Mapped[int] = mapped_column(Integer, default=0)
    leave_breakdown: Mapped[dict] = mapped_column(JSONB, default=dict)  # e.g. {"annual": 12, "sick": 5}
    enrollment_status: Mapped[str] = mapped_column(String, default="pending")
    benefits_plan: Mapped[str] = mapped_column(String, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    employee = relationship("Employee", back_populates="hris_record")
