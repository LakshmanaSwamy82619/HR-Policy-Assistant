import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_employee
from app.models import Employee, Conversation, ConversationTurn, RestoreRequest
from app.schemas.chat import (
    ChatRequest, ChatResponse, ConversationHistoryResponse, ConversationHistoryTurn,
    ConversationSummary, RestoreRequestCreate,
)
from app.services.conversation_service import (
    get_or_create_conversation, list_conversations, get_conversation_title, archive_conversation,
)
from app.agent.graph import run_agent_turn

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    conversation = await get_or_create_conversation(db, employee.id, payload.conversation_id)

    result = await run_agent_turn(db, employee.id, conversation, payload.message)
    await db.commit()

    return ChatResponse(
        conversation_id=conversation.id,
        answer=result["answer"],
        route_taken=result["route"],
        citations=result.get("citations"),
        ticket_id=result.get("ticket_id"),
    )


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_my_conversations(
    status_filter: str = "active",
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """status=active (default) for the sidebar, status=archived for the
    'Archived chats' view. There is no 'deleted' status - archiving is the
    only thing an employee can do to their own conversation; anything
    beyond that (a real restore, or a permanent delete) goes through an
    admin-reviewed restore request."""
    if status_filter not in ("active", "archived"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status must be 'active' or 'archived'")

    conversations = await list_conversations(db, employee.id, status=status_filter)

    summaries = []
    for c in conversations:
        title = await get_conversation_title(db, c.id)
        restore_status = None
        if status_filter == "archived":
            result = await db.execute(
                select(RestoreRequest)
                .where(RestoreRequest.conversation_id == c.id)
                .order_by(RestoreRequest.created_at.desc())
                .limit(1)
            )
            latest_request = result.scalar_one_or_none()
            if latest_request:
                restore_status = latest_request.status

        summaries.append(
            ConversationSummary(
                id=c.id, title=title, started_at=c.started_at, status=c.status,
                archived_at=c.archived_at, restore_request_status=restore_status,
            )
        )
    return summaries


@router.post("/conversations/{conversation_id}/archive", response_model=ConversationSummary)
async def archive_my_conversation(
    conversation_id: uuid.UUID,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete: the conversation moves to 'Archived chats' rather than
    being destroyed. Nothing is permanently removed until an admin approves
    a restore request with the 'delete' action."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conversation = result.scalar_one_or_none()
    if conversation is None or conversation.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    await archive_conversation(db, conversation)
    await db.commit()

    title = await get_conversation_title(db, conversation.id)
    return ConversationSummary(
        id=conversation.id, title=title, started_at=conversation.started_at,
        status=conversation.status, archived_at=conversation.archived_at,
    )


@router.post("/conversations/{conversation_id}/restore-requests", status_code=status.HTTP_201_CREATED)
async def request_restore(
    conversation_id: uuid.UUID,
    payload: RestoreRequestCreate,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Employee asks HR/admin to bring an archived conversation back. Shows
    up in the admin restore-request queue for approve/reject/delete."""
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conversation = result.scalar_one_or_none()
    if conversation is None or conversation.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if conversation.status != "archived":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only archived conversations can be requested for restore")

    restore_request = RestoreRequest(
        id=uuid.uuid4(), conversation_id=conversation.id, employee_id=employee.id, note=payload.note,
    )
    db.add(restore_request)
    await db.commit()
    return {"id": str(restore_request.id), "status": restore_request.status}


@router.get("/{conversation_id}/history", response_model=ConversationHistoryResponse)
async def get_history(
    conversation_id: uuid.UUID,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conversation = result.scalar_one_or_none()
    if conversation is None or conversation.employee_id != employee.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    result = await db.execute(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation_id)
        .order_by(ConversationTurn.created_at.asc())
    )
    turns = result.scalars().all()

    return ConversationHistoryResponse(
        conversation_id=conversation_id,
        turns=[
            ConversationHistoryTurn(role=t.role, content=t.content, route_taken=t.route_taken, citation=t.citation)
            for t in turns
        ],
    )
