"""
Confidence gating for the RAG branch.

If the best-matching chunk's similarity falls below the configured
threshold, we don't let the LLM guess - we route to escalation instead.
This is what protects the 40%-weighted groundedness score from
low-quality retrievals producing hallucinated answers.
"""
from app.config import settings
from app.models import PolicyChunk


def is_confident(scored_chunks: list[tuple[PolicyChunk, float]]) -> bool:
    if not scored_chunks:
        return False
    top_score = scored_chunks[0][1]
    return top_score >= settings.retrieval_similarity_threshold


def filter_confident_chunks(scored_chunks: list[tuple[PolicyChunk, float]]) -> list[tuple[PolicyChunk, float]]:
    """
    Keeps only chunks that individually clear the similarity threshold.

    retrieve_relevant_chunks() returns the top-k nearest chunks regardless
    of how weak the lower-ranked ones are - is_confident() only gates on
    the single best match. Without this filter, every retrieved chunk
    (including ones far below the confidence bar) gets shown to the LLM
    and surfaced as a citation, padding the answer with irrelevant
    sections. Call this AFTER is_confident() has already gated the top
    match; this only trims the tail.
    """
    threshold = settings.retrieval_similarity_threshold
    return [(chunk, score) for chunk, score in scored_chunks if score >= threshold]