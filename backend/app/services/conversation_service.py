"""
Conversation memory management.

Keeps the last N raw turns for direct context, and rolls anything older
into a running summary - this is what lets vague follow-ups ("and how
many do I have left?") resolve correctly without re-sending an
ever-growing transcript to the LLM.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.llm_clients import get_async_openai_client
from app.models import Conversation, ConversationTurn

client = get_async_openai_client()

RECENT_TURNS_WINDOW = 6  # keep last 6 raw turns (3 exchanges) verbatim
SUMMARIZE_AFTER_TURNS = 12  # start summarizing once history exceeds this


async def get_or_create_conversation(db: AsyncSession, employee_id: uuid.UUID, conversation_id: uuid.UUID | None) -> Conversation:
    if conversation_id:
        result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
        conversation = result.scalar_one_or_none()
        if conversation and conversation.employee_id == employee_id and conversation.status == "active":
            return conversation
        # Falls through to create new if not found, not owned by this employee,
        # or archived (an archived conversation is not a valid target to keep
        # chatting in - the employee would need to request it restored first).

    conversation = Conversation(id=uuid.uuid4(), employee_id=employee_id)
    db.add(conversation)
    await db.flush()
    return conversation


async def list_conversations(db: AsyncSession, employee_id: uuid.UUID, status: str = "active") -> list[Conversation]:
    result = await db.execute(
        select(Conversation)
        .where(Conversation.employee_id == employee_id, Conversation.status == status)
        .order_by(Conversation.started_at.desc())
    )
    return list(result.scalars().all())


async def get_conversation_title(db: AsyncSession, conversation_id: uuid.UUID) -> str:
    """Derives a short display title from the first user message, since
    conversations have no dedicated title field."""
    result = await db.execute(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation_id, ConversationTurn.role == "user")
        .order_by(ConversationTurn.created_at.asc())
        .limit(1)
    )
    first_turn = result.scalar_one_or_none()
    if first_turn is None:
        return "New conversation"
    text = first_turn.content.strip()
    return text[:60] + ("..." if len(text) > 60 else "")


async def archive_conversation(db: AsyncSession, conversation: Conversation) -> None:
    conversation.status = "archived"
    conversation.archived_at = datetime.now(timezone.utc)
    await db.flush()


async def get_recent_turns(db: AsyncSession, conversation_id: uuid.UUID, limit: int = RECENT_TURNS_WINDOW) -> list[ConversationTurn]:
    result = await db.execute(
        select(ConversationTurn)
        .where(ConversationTurn.conversation_id == conversation_id)
        .order_by(ConversationTurn.created_at.desc())
        .limit(limit)
    )
    return list(reversed(result.scalars().all()))


async def append_turn(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    route_taken: str | None = None,
    retrieved_chunk_ids: list | None = None,
    citation: list | None = None,
    debug_trace: dict | None = None,
) -> ConversationTurn:
    turn = ConversationTurn(
        id=uuid.uuid4(),
        conversation_id=conversation_id,
        role=role,
        content=content,
        route_taken=route_taken,
        retrieved_chunk_ids=retrieved_chunk_ids,
        citation=citation,
        debug_trace=debug_trace,
    )
    db.add(turn)
    await db.flush()
    return turn


async def maybe_summarize(db: AsyncSession, conversation: Conversation) -> None:
    """
    If the conversation has grown long, fold older turns into the rolling
    summary so future prompts stay small. Cheap check first (count), then
    only call the LLM to summarize if actually needed.
    """
    result = await db.execute(
        select(ConversationTurn).where(ConversationTurn.conversation_id == conversation.id)
    )
    all_turns = result.scalars().all()

    if len(all_turns) <= SUMMARIZE_AFTER_TURNS:
        return

    turns_to_fold = all_turns[:-RECENT_TURNS_WINDOW]
    transcript = "\n".join(f"{t.role}: {t.content}" for t in turns_to_fold)

    prompt = (
        "Summarize this HR chatbot conversation so far in 2-4 sentences, "
        "preserving any facts the employee stated (e.g. leave type asked about, "
        "topics already escalated) that later turns might refer back to:\n\n"
        f"{conversation.summary or ''}\n{transcript}"
    )

    response = await client.chat.completions.create(
        model=settings.llm_model,
        messages=[{"role": "user", "content": prompt}],
    )
    conversation.summary = response.choices[0].message.content
    await db.flush()
