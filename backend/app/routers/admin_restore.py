"""
Admin restore-request queue.

An employee "deleting" a conversation only archives it (see
app/routers/chat.py: POST /chat/conversations/{id}/archive). If they later
want it back, they file a restore request here - HR/admin can approve
(un-archive), reject (stays archived), or delete (permanently gone,
the only path to real deletion in this system).
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_admin
from app.models import Employee, Conversation, RestoreRequest
from app.schemas.restore import RestoreRequestResponse, RestoreRequestActionRequest
from app.services.conversation_service import get_conversation_title

router = APIRouter(prefix="/admin/restore-requests", tags=["admin"])


async def _to_response(db: AsyncSession, req: RestoreRequest) -> RestoreRequestResponse:
    title = await get_conversation_title(db, req.conversation_id)
    return RestoreRequestResponse(
        id=req.id,
        conversation_id=req.conversation_id,
        conversation_title=title,
        employee_id=req.employee_id,
        employee_name=req.employee.name,
        employee_email=req.employee.email,
        status=req.status,
        note=req.note,
        admin_note=req.admin_note,
        created_at=req.created_at,
        resolved_at=req.resolved_at,
    )


@router.get("", response_model=list[RestoreRequestResponse])
async def list_restore_requests(
    status_filter: str | None = Query(None, alias="status"),
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(RestoreRequest).options(selectinload(RestoreRequest.employee)).order_by(RestoreRequest.created_at.desc())
    if status_filter:
        query = query.where(RestoreRequest.status == status_filter)

    result = await db.execute(query)
    requests = result.scalars().all()
    return [await _to_response(db, r) for r in requests]


@router.patch("/{request_id}", response_model=RestoreRequestResponse)
async def action_restore_request(
    request_id: uuid.UUID,
    payload: RestoreRequestActionRequest,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RestoreRequest).options(selectinload(RestoreRequest.employee)).where(RestoreRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if req is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restore request not found")

    conv_result = await db.execute(select(Conversation).where(Conversation.id == req.conversation_id))
    conversation = conv_result.scalar_one_or_none()

    if payload.action == "approve":
        if conversation is not None:
            conversation.status = "active"
            conversation.archived_at = None
        req.status = "approved"
    elif payload.action == "reject":
        req.status = "rejected"

    req.admin_note = payload.admin_note
    req.resolved_at = datetime.now(timezone.utc)
    req.resolved_by_id = admin.id

    if payload.action == "delete":
        # Snapshot everything we need to respond with BEFORE deleting -
        # cascading the delete through Conversation.restore_requests will
        # remove this very row too, and SQLAlchemy expires deleted objects
        # on commit, so req's attributes wouldn't be safely readable after.
        snapshot = RestoreRequestResponse(
            id=req.id, conversation_id=req.conversation_id, conversation_title="(deleted)",
            employee_id=req.employee_id, employee_name=req.employee.name, employee_email=req.employee.email,
            status="rejected", note=req.note, admin_note=payload.admin_note,
            created_at=req.created_at, resolved_at=req.resolved_at,
        )
        if conversation is not None:
            # Permanent delete - the only path to real, irreversible removal.
            # Cascades to conversation_turns and this conversation's other
            # restore_requests via the ORM relationship cascade.
            await db.delete(conversation)
        await db.commit()
        return snapshot

    await db.commit()

    result = await db.execute(
        select(RestoreRequest).options(selectinload(RestoreRequest.employee)).where(RestoreRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    return await _to_response(db, req)
