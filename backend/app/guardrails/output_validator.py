"""
Output-side guardrail for the RAG branch.

Every policy answer must be traceable to a retrieved chunk (per the
auditability requirement). If the LLM produces an answer with no
citation attached, that's treated as a hallucination risk and the
turn is redirected to escalation rather than returned to the employee.
"""


def validate_rag_output(answer: str, citations: list[dict]) -> bool:
    """Returns True if the answer is safe to return as-is."""
    if not answer or not answer.strip():
        return False
    if not citations:
        # No source grounding - cannot verify the claim, so don't ship it.
        return False
    return True
