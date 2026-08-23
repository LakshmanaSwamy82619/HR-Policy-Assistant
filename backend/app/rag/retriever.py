"""
Retrieval over the policy_chunks table using pgvector similarity search.
"""
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.llm_clients import get_async_openai_client
from app.models import PolicyChunk

client = get_async_openai_client()


async def embed_query(text: str) -> list[float]:
    """Embed a single query string using the configured embedding model."""
    response = await client.embeddings.create(model=settings.embedding_model, input=text)
    return response.data[0].embedding


async def retrieve_relevant_chunks(
    db: AsyncSession,
    query: str,
    top_k: int | None = None,
    category_filter: str | None = None,
) -> list[tuple[PolicyChunk, float]]:
    """
    Returns a list of (chunk, similarity_score) tuples, ordered by relevance.
    Similarity is computed as 1 - cosine_distance so higher = more relevant,
    which keeps the downstream threshold check intuitive.
    """
    top_k = top_k or settings.retrieval_top_k
    query_embedding = await embed_query(query)

    # cosine_distance is provided by pgvector's SQLAlchemy integration
    distance = PolicyChunk.embedding.cosine_distance(query_embedding)
    stmt = select(PolicyChunk, distance.label("distance"))

    if category_filter:
        stmt = stmt.where(PolicyChunk.chunk_metadata["category"].astext == category_filter)

    stmt = stmt.order_by(distance).limit(top_k)

    result = await db.execute(stmt)
    rows = result.all()

    # Convert distance to a similarity score in [0, 1] for the confidence check.
    return [(chunk, 1 - dist) for chunk, dist in rows]