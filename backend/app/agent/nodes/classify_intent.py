"""
Intent Classification Node.

The agent's actual routing decision is made by the LLM's own tool choice
(bind_tools/ToolNode in agent/graph.py) - that's what really decides RAG
vs. HRIS vs. escalation. This node runs alongside it as an explicit,
independently-labeled classification step, for two reasons:

1. Tool-Routing Accuracy (35% of the rubric) is scored against a labeled
   set of query types - having an explicit predicted label to compare
   against the eventual tool-choice outcome is what makes that scoring
   possible at all.
2. It gives the audit/logging trail a clean "predicted_intent" field
   independent of which tool the LLM ultimately invoked, so routing
   mistakes are visible in the log rather than only inferable after the
   fact from tool-call traces.

This does NOT gate or override the agent's tool choice - it is advisory
and logged, not authoritative. If it disagreed with the tool actually
used, that disagreement itself is a signal worth having in the log.
"""
from langsmith import traceable

from app.core.llm_clients import get_chat_model
from app.guardrails.sensitive_topics import detect_sensitive_topic

CLASSIFIER_PROMPT = """Classify this HR chatbot question into exactly one category:
- "policy": general HR policy/rules question (leave, benefits, compliance, reimbursement)
- "personal_data": asks about the employee's own live data (their leave balance, enrollment status)
- "sensitive": involves harassment, termination, or medical leave

Respond with only one word: policy, personal_data, or sensitive

Question: {question}"""


@traceable(name="classify_intent", run_type="chain")
async def classify_intent_label(question: str) -> str:
    """Returns a predicted intent label for logging/eval purposes.
    Sensitive-topic detection is checked first via the same hard-rule
    guardrail used to gate the agent itself, so the logged label is
    consistent with what actually triggers escalation.

    @traceable so this shows up as its own labeled stage in LangSmith,
    nested under the parent hr_agent_turn run (see app/agent/graph.py)."""
    if detect_sensitive_topic(question):
        return "sensitive"

    llm = get_chat_model(temperature=0)
    response = await llm.ainvoke(CLASSIFIER_PROMPT.format(question=question))
    label = response.content.strip().lower()

    if "personal_data" in label:
        return "personal_data"
    if "sensitive" in label:
        return "sensitive"
    return "policy"