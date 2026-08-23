"""
Builds the prompt sent to the LLM for the RAG branch.

The instruction to cite section_id per claim, and to refuse rather than
guess when context is insufficient, is what RAGAS faithfulness scoring
actually depends on - so this prompt shape is not cosmetic.
"""
from app.models import PolicyChunk

SYSTEM_INSTRUCTIONS = """You are an HR policy assistant. Answer the employee's question using
ONLY the policy excerpts provided below. For every factual claim, cite the
section it came from using the format [Section {section_id}].

If the provided excerpts do not contain enough information to answer
confidently, say so explicitly instead of guessing - do not invent policy
details that are not present in the excerpts."""


def build_rag_prompt(question: str, conversation_summary: str | None, scored_chunks: list[tuple[PolicyChunk, float]]) -> list[dict]:
    context_blocks = "\n\n".join(
        f"[Section {chunk.section_id}] {chunk.section_title or ''}\n{chunk.content}"
        for chunk, _ in scored_chunks
    )

    user_content = ""
    if conversation_summary:
        user_content += f"Conversation so far (summary): {conversation_summary}\n\n"
    user_content += f"Policy excerpts:\n{context_blocks}\n\nEmployee question: {question}"

    return [
        {"role": "system", "content": SYSTEM_INSTRUCTIONS},
        {"role": "user", "content": user_content},
    ]
