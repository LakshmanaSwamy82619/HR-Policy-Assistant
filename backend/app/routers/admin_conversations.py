"""
Admin conversation browser + pipeline trace viewer.

Lets HR/admin see any employee's conversations (active or archived) and,
for each assistant answer, the underlying pipeline trace: predicted
intent, which tool actually ran, retrieval query + similarity scores +
threshold + which candidates made the cut, and stage timings. This is
recorded at answer time in app/agent/graph.py and persisted on
ConversationTurn.debug_trace - nothing here is reconstructed after the
fact, it reflects exactly what happened for that specific historical
answer.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_admin
from app.models import Employee, Conversation, ConversationTurn
from app.schemas.admin_conversation import AdminConversationSummary, AdminConversationMessages, AdminTurnResponse
from app.services.conversation_service import get_conversation_title

router = APIRouter(prefix="/admin/conversations", tags=["admin"])


@router.get("", response_model=list[AdminConversationSummary])
async def list_conversations(
    status_filter: str | None = Query(None, alias="status"),
    employee_id: uuid.UUID | None = None,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Conversation, Employee).join(Employee, Conversation.employee_id == Employee.id)
    if status_filter:
        query = query.where(Conversation.status == status_filter)
    if employee_id:
        query = query.where(Conversation.employee_id == employee_id)
    query = query.order_by(Conversation.started_at.desc())

    result = await db.execute(query)
    rows = result.all()

    summaries = []
    for conversation, employee in rows:
        title = await get_conversation_title(db, conversation.id)
        count_result = await db.execute(
            select(func.count()).select_from(ConversationTurn).where(ConversationTurn.conversation_id == conversation.id)
        )
        turn_count = count_result.scalar_one()
        summaries.append(
            AdminConversationSummary(
                id=conversation.id, employee_id=employee.id, employee_name=employee.name,
                employee_email=employee.email, title=title, started_at=conversation.started_at,
                status=conversation.status, turn_count=turn_count,
            )
        )
    return summaries


@router.get("/{conversation_id}/messages", response_model=AdminConversationMessages)
async def get_conversation_messages(
    conversation_id: uuid.UUID,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation, Employee)
        .join(Employee, Conversation.employee_id == Employee.id)
        .where(Conversation.id == conversation_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    conversation, employee = row

    turns_result = await db.execute(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation_id)
        .order_by(ConversationTurn.created_at.asc())
    )
    turns = turns_result.scalars().all()

    return AdminConversationMessages(
        conversation_id=conversation.id,
        employee_name=employee.name,
        employee_email=employee.email,
        turns=[
            AdminTurnResponse(
                id=t.id, role=t.role, content=t.content, route_taken=t.route_taken,
                citation=t.citation, debug_trace=t.debug_trace, created_at=t.created_at,
            )
            for t in turns
        ],
    )
