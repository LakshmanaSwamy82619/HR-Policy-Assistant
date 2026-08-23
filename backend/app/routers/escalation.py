import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_employee
from app.models import Employee, EscalationTicket, TicketMessage
from app.schemas.escalation import (
    EscalationCreateRequest, EscalationResponse, TicketMessageCreate, TicketMessageResponse,
)
from app.agent.tools.escalation_tool import create_escalation_ticket

router = APIRouter(prefix="/escalation", tags=["escalation"])


def _to_message(msg: TicketMessage) -> TicketMessageResponse:
    return TicketMessageResponse(
        id=msg.id,
        sender_role=msg.sender_role,
        sender_name=msg.sender.name if msg.sender else "Unknown",
        message=msg.message,
        created_at=msg.created_at,
    )


def _to_response(ticket: EscalationTicket) -> EscalationResponse:
    return EscalationResponse(
        id=ticket.id,
        conversation_id=ticket.conversation_id,
        status=ticket.status,
        reason=ticket.reason,
        topic_category=ticket.topic_category,
        resolution_note=ticket.resolution_note,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[_to_message(m) for m in ticket.messages] if ticket.messages else [],
    )


async def _get_owned_ticket(db: AsyncSession, ticket_id: uuid.UUID, employee: Employee) -> EscalationTicket:
    result = await db.execute(
        select(EscalationTicket)
        .options(selectinload(EscalationTicket.messages).selectinload(TicketMessage.sender))
        .where(EscalationTicket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()
    if ticket is None or ticket.employee_id != employee.id:
        # Same generic 404 for "not found" and "not yours" - don't leak existence of other tickets.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return ticket


@router.post("/tickets", response_model=EscalationResponse)
async def create_ticket(
    payload: EscalationCreateRequest,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    ticket = await create_escalation_ticket(
        db, employee.id, payload.conversation_id, payload.reason, payload.topic_category,
    )
    await db.commit()
    return _to_response(ticket)


@router.get("/tickets", response_model=list[EscalationResponse])
async def list_my_tickets(
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Every ticket raised for the current employee, most recent first -
    including its live status, HR's resolution note, and the full
    back-and-forth thread with HR once actioned."""
    result = await db.execute(
        select(EscalationTicket)
        .options(selectinload(EscalationTicket.messages).selectinload(TicketMessage.sender))
        .where(EscalationTicket.employee_id == employee.id)
        .order_by(EscalationTicket.created_at.desc())
    )
    tickets = result.scalars().all()
    return [_to_response(t) for t in tickets]


@router.get("/tickets/{ticket_id}", response_model=EscalationResponse)
async def get_ticket(
    ticket_id: uuid.UUID,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    ticket = await _get_owned_ticket(db, ticket_id, employee)
    return _to_response(ticket)


@router.post("/tickets/{ticket_id}/messages", response_model=EscalationResponse)
async def post_ticket_message(
    ticket_id: uuid.UUID,
    payload: TicketMessageCreate,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Employee replies on their own ticket thread - typically used when
    HR asked for more information (e.g. the manager's name) while the
    ticket is in_progress."""
    ticket = await _get_owned_ticket(db, ticket_id, employee)

    ticket_message = TicketMessage(
        id=uuid.uuid4(), ticket_id=ticket.id, sender_id=employee.id,
        sender_role="employee", message=payload.message,
    )
    db.add(ticket_message)
    await db.flush()
    await db.commit()

    ticket = await _get_owned_ticket(db, ticket_id, employee)
    return _to_response(ticket)
