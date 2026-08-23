"""
Policy document ingestion pipeline: load -> clean -> chunk -> embed -> store.

Chunking is section-aware (splits on numbered headers like "3.2 Sick Leave")
rather than fixed-size windows, because citations must point to a specific
policy section - a fixed-size chunk boundary would cut across sections and
produce a citation that doesn't correspond to anything a human could look up.
"""
import re
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.llm_clients import get_async_openai_client
from app.models import PolicyDocument, PolicyChunk

client = get_async_openai_client()

# Matches headers like "3.2 Sick Leave" or "1. Overview" at the start of a line.
SECTION_HEADER_PATTERN = re.compile(r"^\s*(\d+(?:\.\d+)*)\s+(.+)$", re.MULTILINE)


def clean_text(raw_text: str) -> str:
    """Normalize whitespace and strip non-content artifacts (page numbers, etc.)."""
    text = re.sub(r"\r\n", "\n", raw_text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_by_section(cleaned_text: str) -> list[dict]:
    """
    Splits text into chunks aligned to section headers.
    Returns a list of {section_id, section_title, content} dicts.
    Falls back to a single chunk if no section headers are found.
    """
    matches = list(SECTION_HEADER_PATTERN.finditer(cleaned_text))
    if not matches:
        return [{"section_id": "1", "section_title": None, "content": cleaned_text}]

    chunks = []
    for i, match in enumerate(matches):
        section_id, section_title = match.group(1), match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(cleaned_text)
        content = cleaned_text[start:end].strip()
        if content:
            chunks.append({"section_id": section_id, "section_title": section_title, "content": content})
    return chunks


async def embed_chunks(chunk_texts: list[str]) -> list[list[float]]:
    """Batch-embed chunk contents in a single API call."""
    response = await client.embeddings.create(model=settings.embedding_model, input=chunk_texts)
    return [item.embedding for item in response.data]


async def ingest_policy_document(
    db: AsyncSession,
    title: str,
    category: str,
    source_file: str,
    raw_text: str,
) -> PolicyDocument:
    """Full ingestion pipeline for one policy document."""
    document = PolicyDocument(id=uuid.uuid4(), title=title, category=category, source_file=source_file)
    db.add(document)
    await db.flush()  # get document.id without committing yet

    cleaned = clean_text(raw_text)
    raw_chunks = chunk_by_section(cleaned)
    embeddings = await embed_chunks([c["content"] for c in raw_chunks])

    for chunk_data, embedding in zip(raw_chunks, embeddings):
        db.add(PolicyChunk(
            id=uuid.uuid4(),
            document_id=document.id,
            section_id=chunk_data["section_id"],
            section_title=chunk_data["section_title"],
            content=chunk_data["content"],
            embedding=embedding,
            chunk_metadata={"category": category, "document_title": title},
        ))

    await db.commit()
    await db.refresh(document)
    return document
