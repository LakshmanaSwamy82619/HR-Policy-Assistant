"""
Hard-rule sensitive-topic detection.

These topics escalate to a human REGARDLESS of retrieval confidence —
this is a deliberate design choice per the project brief: legally sensitive
areas (harassment, termination, medical leave) must never be answered
purely by the LLM, even if the RAG pipeline is confident.

Kept as an explicit keyword/category list (rather than folded into the
general LLM classifier) so it's auditable and easy to extend without
retraining or re-prompting the classifier.
"""

SENSITIVE_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "harassment": ["harassment", "harassed", "hostile work environment", "discrimination", "assault"],
    "termination": ["fired", "termination", "terminated", "layoff", "being let go", "severance"],
    "medical_leave": ["medical leave", "fmla", "disability leave", "mental health leave", "diagnosis"],
}


def detect_sensitive_topic(text: str) -> str | None:
    """Returns the matched topic category, or None if no sensitive topic is detected."""
    lowered = text.lower()
    for category, keywords in SENSITIVE_TOPIC_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return None
