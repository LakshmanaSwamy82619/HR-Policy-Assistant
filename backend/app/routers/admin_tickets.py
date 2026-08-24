"""
Admin/HR ticket queue.

Escalation tickets are created against the *employee's* account (via
POST /escalation/tickets, called by the agent or the employee themselves).
This router is where HR/admin accounts actually see the full queue across
all employees, filter it, action it, and hold a back-and-forth conversation
with the employee while it's open - gated by the same is_admin flag already
used for policy-document ingestion (admin_policy.py) and employee
provisioning (admin_employees.py).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_admin
from app.models import Employee, EscalationTicket, TicketMessage
from app.schemas.escalation import (
    EscalationAdminResponse, EscalationUpdateRequest, TicketMessageCreate, TicketMessageResponse,
)

router = APIRouter(prefix="/admin/tickets", tags=["admin"])


def _to_message(msg: TicketMessage) -> TicketMessageResponse:
    return TicketMessageResponse(
        id=msg.id,
        sender_role=msg.sender_role,
        sender_name=msg.sender.name if msg.sender else "Unknown",
        message=msg.message,
        created_at=msg.created_at,
    )


def _to_admin_response(ticket: EscalationTicket) -> EscalationAdminResponse:
    return EscalationAdminResponse(
        id=ticket.id,
        conversation_id=ticket.conversation_id,
        status=ticket.status,
        reason=ticket.reason,
        topic_category=ticket.topic_category,
        resolution_note=ticket.resolution_note,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        employee_id=ticket.employee_id,
        employee_name=ticket.employee.name,
        employee_email=ticket.employee.email,
        resolved_by_name=ticket.resolved_by.name if ticket.resolved_by else None,
        messages=[_to_message(m) for m in ticket.messages] if ticket.messages else [],
        pipeline_trace=ticket.pipeline_trace,
        langsmith_run_id=ticket.langsmith_run_id,
        langsmith_trace_url=ticket.langsmith_trace_url,
    )


def _ticket_query():
    return select(EscalationTicket).options(
        selectinload(EscalationTicket.employee),
        selectinload(EscalationTicket.resolved_by),
        selectinload(EscalationTicket.messages).selectinload(TicketMessage.sender),
    )


@router.get("", response_model=list[EscalationAdminResponse])
async def list_tickets(
    status_filter: str | None = Query(None, alias="status"),
    reason_filter: str | None = Query(None, alias="reason"),
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = _ticket_query().order_by(EscalationTicket.created_at.desc())
    if status_filter:
        query = query.where(EscalationTicket.status == status_filter)
    if reason_filter:
        query = query.where(EscalationTicket.reason == reason_filter)

    result = await db.execute(query)
    tickets = result.scalars().all()
    return [_to_admin_response(t) for t in tickets]


@router.get("/{ticket_id}", response_model=EscalationAdminResponse)
async def get_ticket(
    ticket_id: uuid.UUID,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(_ticket_query().where(EscalationTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return _to_admin_response(ticket)


@router.patch("/{ticket_id}", response_model=EscalationAdminResponse)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: EscalationUpdateRequest,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """HR actions a ticket: change its status and/or leave a resolution note.
    The employee sees both immediately via GET /escalation/tickets."""
    result = await db.execute(_ticket_query().where(EscalationTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    if payload.status is not None:
        ticket.status = payload.status
    if payload.resolution_note is not None:
        ticket.resolution_note = payload.resolution_note

    if payload.status in ("resolved", "closed"):
        ticket.resolved_by_id = admin.id
        ticket.resolved_at = datetime.now(timezone.utc)

    await db.commit()
    result = await db.execute(_ticket_query().where(EscalationTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    return _to_admin_response(ticket)


@router.post("/{ticket_id}/messages", response_model=EscalationAdminResponse)
async def post_ticket_message(
    ticket_id: uuid.UUID,
    payload: TicketMessageCreate,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """HR asks the employee something (e.g. 'can you name the manager
    involved?') while the ticket is open/in_progress. Posting a message
    does not change status on its own - action the ticket separately if
    you also want to mark it in_progress."""
    result = await db.execute(_ticket_query().where(EscalationTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")

    ticket_message = TicketMessage(
        id=uuid.uuid4(), ticket_id=ticket.id, sender_id=admin.id,
        sender_role="admin", message=payload.message,
    )
    db.add(ticket_message)
    await db.flush()
    await db.commit()

    result = await db.execute(_ticket_query().where(EscalationTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    return _to_admin_response(ticket)