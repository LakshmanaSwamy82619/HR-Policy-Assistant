"""
Policy RAG search tool - mirrors the rag_search @tool pattern from
Agentic_Workflow_Langgraph_Langsmith.ipynb, but backed by our pgvector
store instead of an in-memory one.

NOTE: the make_policy_search_tool() wrapper below (a real LangChain @tool)
is currently UNUSED by app/agent/graph.py, for the same gateway-limitation
reason documented in hris_tool.py - retrieve_relevant_chunks() is called
directly instead. Kept for future use with a tool-calling-capable gateway.

Bound per-request to a db session so retrieval runs against the live
Postgres connection for that request. Retrieved chunks are captured in a
list passed in by the caller (not module-level state) so concurrent
requests never interfere with each other's retrieval results.
"""
import time

from langchain_core.tools import tool
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.confidence import is_confident, filter_confident_chunks


def make_policy_search_tool(db: AsyncSession, retrieval_capture: list, debug: dict | None = None):
    """
    retrieval_capture: an empty list the caller owns for this request only.
    The tool appends the scored chunks from its most recent call so the
    calling node can build citations afterward - a LangChain tool can only
    return a string to the LLM, so this side-channel is how the caller
    recovers the structured (chunk, score) data.

    debug: an optional dict the caller owns, used to surface the retrieval
    pipeline's internals (query, similarity threshold, per-candidate
    vector scores, which candidates cleared the confidence bar, and
    retrieval latency) for the admin pipeline-trace view. Employees never
    see this - only recorded so HR/admin can inspect what happened.
    """

    @tool
    async def policy_search(query: str) -> str:
        """Search HR policy documents (leave, benefits, compliance, reimbursement)
        for information relevant to the employee's question. Returns matching
        policy excerpts with their section numbers, or a message indicating no
        confident match was found."""
        start = time.perf_counter()
        scored_chunks = await retrieve_relevant_chunks(db, query)
        elapsed_ms = round((time.perf_counter() - start) * 1000)
        retrieval_capture.clear()

        confident = is_confident(scored_chunks)
        # Only keep chunks that individually clear the similarity threshold -
        # is_confident() only gates on the top match, so without this the
        # LLM (and citations) would see every retrieved chunk, including
        # weak/irrelevant ones from lower down the top-k list.
        confident_chunks = filter_confident_chunks(scored_chunks) if confident else []
        confident_ids = {chunk.id for chunk, _ in confident_chunks}

        if debug is not None:
            debug["query"] = query
            debug["threshold"] = settings.retrieval_similarity_threshold
            debug["confident"] = confident
            debug["retrieval_ms"] = elapsed_ms
            debug["candidates"] = [
                {
                    "section_id": chunk.section_id,
                    "section_title": chunk.section_title,
                    "document_title": (chunk.chunk_metadata or {}).get("document_title"),
                    "vector_score": round(float(score), 4),
                    "used_in_context": chunk.id in confident_ids,
                }
                for chunk, score in scored_chunks
            ]

        if not confident:
            return "NO_CONFIDENT_MATCH"

        retrieval_capture.extend(confident_chunks)
        return "\n\n".join(
            f"[Section {chunk.section_id}] {chunk.section_title or ''}\n{chunk.content}"
            for chunk, _ in confident_chunks
        )

    return policy_search
