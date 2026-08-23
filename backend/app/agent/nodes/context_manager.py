import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation
from app.services.conversation_service import append_turn, maybe_summarize


async def update_context(
    db: AsyncSession,
    conversation: Conversation,
    user_message: str,
    assistant_answer: str,
    route_taken: str,
    chunk_ids: list | None = None,
    citations: list | None = None,
    debug_trace: dict | None = None,
) -> None:
    """Persists both sides of the turn, then folds older history into the
    rolling summary if the conversation has grown long."""
    await append_turn(db, conversation.id, role="user", content=user_message)
    await append_turn(
        db, conversation.id, role="assistant", content=assistant_answer,
        route_taken=route_taken, retrieved_chunk_ids=chunk_ids, citation=citations,
        debug_trace=debug_trace,
    )
    await maybe_summarize(db, conversation)
