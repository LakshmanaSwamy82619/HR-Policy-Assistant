"""
Agent orchestration - real LangGraph StateGraph with native tool calling.

Matches the Agentic_Workflow_Langgraph_Langsmith.ipynb Example 1 pattern
(bind_tools + ToolNode + conditional routing) and the project brief's
"Expected Stack" ("Agent: LangGraph with conditional routing between RAG,
tool, and escalation nodes").

An earlier version of this module used a manual JSON-action ReAct loop,
because the LLM gateway in use at the time returned tool_calls=[] on every
request regardless of model name - confirmed with a bare direct API call.
Switching to a real OpenAI key restored native tool-calling support
(verified with check_tool_calling.py), so this module now uses the
intended bind_tools/ToolNode graph instead of the manual fallback.

Sensitive-topic detection still runs BEFORE the graph is even built, as a
hard deterministic rule per the project brief - these topics must escalate
regardless of model confidence, so it is never left to the LLM's choice.
"""
import time
import uuid

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langgraph.errors import GraphRecursionError
from langgraph.graph import END, StateGraph
from langgraph.prebuilt import ToolNode
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.nodes.classify_intent import classify_intent_label
from app.agent.nodes.context_manager import update_context
from app.agent.nodes.logging_node import log_turn
from app.agent.state import AgentState
from app.agent.tools.escalation_tool import create_escalation_ticket, make_escalation_tool
from app.agent.tools.hris_tool import make_hris_lookup_tool
from app.agent.tools.policy_search_tool import make_policy_search_tool
from app.core.llm_clients import get_chat_model
from app.core.logging import logger
from app.guardrails.output_validator import validate_rag_output
from app.guardrails.sensitive_topics import detect_sensitive_topic
from app.models import Conversation
from app.services.conversation_service import get_recent_turns

MAX_AGENT_STEPS = 4  # hard cap on assistant<->tools round trips
RECURSION_LIMIT = MAX_AGENT_STEPS * 2 + 2  # each round trip = 2 node visits, plus a safety margin

SYSTEM_PROMPT = """You are an HR policy assistant helping an employee. You have three tools
available: policy_search, hris_lookup, and escalate_to_hr.

Rules you MUST follow:
1. For general HR policy questions (leave rules, benefits, compliance, reimbursement), you MUST
   call policy_search first. Never answer a policy question from your own knowledge. Once you have
   the tool result, give your final answer citing the section number for every claim, using the
   format [Section X] - only cite sections that were actually returned by the tool.
2. For personal-data questions (the employee's own leave balance, enrollment status), call
   hris_lookup first, then answer using its result.
3. If policy_search returns NO_CONFIDENT_MATCH, or hris_lookup returns NO_RECORD_FOUND, call
   escalate_to_hr (reason="low_confidence") instead of guessing an answer.
4. Use the conversation history to resolve vague or follow-up questions (e.g. "and how many do I
   have left?", "what about that one") - infer the topic from prior turns instead of asking the
   employee to repeat themselves, unless the history genuinely gives no clue what they mean.
5. Once a tool has returned a result, give a natural final answer directly to the employee - don't
   mention tool names or internal mechanics."""


def route_after_model(state: AgentState) -> str:
    """Decides whether the graph should route to the tools node or end the
    turn, based on whether the model's latest message requested a tool call.
    Kept as a standalone module-level function (rather than nested inside
    _build_graph) so it can be unit tested in isolation."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return END


def _build_graph(tools: list):
    """Builds a fresh compiled graph bound to this request's tool instances
    (each tool closes over this request's db session / employee id /
    conversation id, so a new graph is built per request rather than
    reused globally)."""
    llm_with_tools = get_chat_model(temperature=0).bind_tools(tools)

    async def call_model(state: AgentState) -> dict:
        response = await llm_with_tools.ainvoke(state["messages"])
        return {"messages": [response]}

    builder = StateGraph(AgentState)
    builder.add_node("assistant", call_model)
    builder.add_node("tools", ToolNode(tools))
    builder.set_entry_point("assistant")
    builder.add_conditional_edges("assistant", route_after_model, {"tools": "tools", END: END})
    builder.add_edge("tools", "assistant")
    return builder.compile()


def _make_escalation_result(ticket, low_confidence: bool = True) -> dict:
    prefix = "I'm not confident I can answer that accurately from available policy information."
    if not low_confidence:
        prefix = "This involves a sensitive topic that's best handled by a member of the HR team directly."
    return {
        "route": "escalation",
        "answer": f"{prefix} I've escalated this to HR (ticket #{str(ticket.id)[:8]}) so a team member can help you directly.",
        "ticket_id": ticket.id,
    }


def _build_trace(
    predicted_intent: str,
    sensitive_category: str | None,
    route: str,
    tool_used: str | None,
    classify_ms: int,
    agent_ms: int | None,
    retrieval_debug: dict,
) -> dict:
    """Assembles the admin-only pipeline trace persisted alongside the
    assistant's turn - what the agent actually did for this specific
    answer, not a description of the codebase in general. Employees never
    see this; it's surfaced only in the admin pipeline-trace drawer."""
    timings_ms = {"classify_ms": classify_ms}
    if agent_ms is not None:
        timings_ms["agent_ms"] = agent_ms
    if retrieval_debug.get("retrieval_ms") is not None:
        timings_ms["retrieval_ms"] = retrieval_debug["retrieval_ms"]
    timings_ms["total_ms"] = sum(v for v in timings_ms.values() if isinstance(v, (int, float)))

    trace = {
        "predicted_intent": predicted_intent,
        "sensitive_category": sensitive_category,
        "route_taken": route,
        "tool_used": tool_used,
        "system_prompt": SYSTEM_PROMPT,
        "timings_ms": timings_ms,
    }
    if retrieval_debug:
        trace["retrieval"] = {
            "query": retrieval_debug.get("query"),
            "similarity_threshold": retrieval_debug.get("threshold"),
            "confident": retrieval_debug.get("confident"),
            "candidates": retrieval_debug.get("candidates", []),
        }
    return trace


async def run_agent_turn(
    db: AsyncSession,
    employee_id: uuid.UUID,
    conversation: Conversation,
    message: str,
) -> dict:
    """
    Runs one full agent turn through the real LangGraph StateGraph, then
    persists the turn via the context manager. Returns a dict shaped for
    ChatResponse: {"route", "answer", "citations"?, "ticket_id"?, "chunk_ids"?}.
    """
    classify_start = time.perf_counter()
    predicted_intent = await classify_intent_label(message)
    classify_ms = round((time.perf_counter() - classify_start) * 1000)

    # --- Hard-rule sensitive-topic check runs BEFORE the graph is built ---
    sensitive_category = detect_sensitive_topic(message)
    if sensitive_category:
        ticket = await create_escalation_ticket(
            db, employee_id, conversation.id, reason="sensitive_topic", topic_category=sensitive_category,
        )
        result = _make_escalation_result(ticket, low_confidence=False)
        result["debug"] = _build_trace(
            predicted_intent, sensitive_category, result["route"], None, classify_ms, None, {}
        )
        await _persist(db, conversation, message, result)
        log_turn(conversation.id, employee_id, message, predicted_intent, result["route"], result.get("citations"), result.get("ticket_id"))
        return result

    # --- Build this request's tools (each closes over db/employee_id/conversation.id) ---
    retrieval_capture: list = []
    retrieval_debug: dict = {}
    policy_search = make_policy_search_tool(db, retrieval_capture, retrieval_debug)
    hris_lookup = make_hris_lookup_tool(db, employee_id)
    escalate_to_hr = make_escalation_tool(db, employee_id, conversation.id)
    tools = [policy_search, hris_lookup, escalate_to_hr]

    graph = _build_graph(tools)

    # --- Build prompt context: system prompt, rolling summary (long threads),
    # recent raw turns (short-term memory), then the new user message. ---
    messages = [SystemMessage(content=SYSTEM_PROMPT)]

    if conversation.summary:
        messages.append(SystemMessage(content=f"Conversation so far (summary): {conversation.summary}"))

    recent_turns = await get_recent_turns(db, conversation.id)
    for turn in recent_turns:
        if turn.role == "assistant":
            messages.append(AIMessage(content=turn.content))
        else:
            messages.append(HumanMessage(content=turn.content))

    messages.append(HumanMessage(content=message))

    result: dict | None = None
    agent_ms: int | None = None
    last_tool_name: str | None = None

    try:
        agent_start = time.perf_counter()
        final_state = await graph.ainvoke({"messages": messages}, config={"recursion_limit": RECURSION_LIMIT})
        agent_ms = round((time.perf_counter() - agent_start) * 1000)
        final_messages = final_state["messages"]
        final_answer = final_messages[-1]
        answer_text = final_answer.content if isinstance(final_answer, AIMessage) else ""

        # Scan tool call results (in order) to determine which tool(s) were
        # actually used and whether escalation happened.
        escalation_ticket_id: str | None = None
        last_tool_content: str | None = None

        for msg in final_messages:
            if isinstance(msg, ToolMessage):
                last_tool_name = msg.name
                last_tool_content = msg.content
                if msg.name == "escalate_to_hr" and isinstance(msg.content, str) and msg.content.startswith("TICKET_CREATED:"):
                    escalation_ticket_id = msg.content.split(":", 1)[1]

        if escalation_ticket_id:
            result = {
                "route": "escalation",
                "answer": answer_text or (
                    "I've escalated this to HR so a team member can help you directly."
                ),
                "ticket_id": uuid.UUID(escalation_ticket_id),
            }
        elif last_tool_name == "hris_lookup" and last_tool_content == "NO_RECORD_FOUND":
            # Safety net: model was told to escalate on NO_RECORD_FOUND but
            # didn't - don't let it improvise an answer with no data.
            ticket = await create_escalation_ticket(db, employee_id, conversation.id, reason="low_confidence")
            result = _make_escalation_result(ticket)
        elif last_tool_name == "policy_search" and retrieval_capture:
            citations = [
                {
                    "document_title": chunk.chunk_metadata.get("document_title"),
                    "section_id": chunk.section_id,
                    "section_title": chunk.section_title,
                }
                for chunk, _ in retrieval_capture
            ]
            result = {
                "route": "rag",
                "answer": answer_text,
                "citations": citations,
                "chunk_ids": [str(chunk.id) for chunk, _ in retrieval_capture],
            }
        elif last_tool_name == "hris_lookup":
            result = {"route": "hris", "answer": answer_text}
        else:
            # No tool grounded this answer (either no tool was called, or
            # policy_search returned NO_CONFIDENT_MATCH and the model
            # answered anyway) - treat as ungrounded so the safety net
            # below escalates instead of shipping an unsourced guess.
            result = {"route": "rag", "answer": answer_text, "citations": []}

    except GraphRecursionError:
        # Model kept requesting tools past the step cap - hand off to HR
        # rather than risk an infinite or runaway loop.
        ticket = await create_escalation_ticket(db, employee_id, conversation.id, reason="low_confidence")
        result = _make_escalation_result(ticket)

    except Exception as exc:
        # Infrastructure failure - bad/missing API key, gateway unreachable,
        # rate limit, timeout, etc. The employee must still get a graceful
        # response and a human safety net, not a raw 500.
        logger.error(f"LLM/agent call failed, escalating to HR: {exc}")
        ticket = await create_escalation_ticket(db, employee_id, conversation.id, reason="system_error")
        result = {
            "route": "escalation",
            "answer": (
                "I'm having trouble processing your request right now due to a system issue. "
                f"I've created a ticket (#{str(ticket.id)[:8]}) so HR can follow up with you directly."
            ),
            "ticket_id": ticket.id,
        }
        result["debug"] = _build_trace(
            predicted_intent, sensitive_category, result["route"], last_tool_name, classify_ms, agent_ms, retrieval_debug
        )
        await _persist(db, conversation, message, result)
        log_turn(conversation.id, employee_id, message, predicted_intent, result["route"], result.get("citations"), result.get("ticket_id"))
        return result

    # Safety net: an ungrounded "rag" answer (no citations) never ships -
    # escalate instead, same guardrail as before.
    if result["route"] == "rag" and not validate_rag_output(result["answer"], result.get("citations") or []):
        ticket = await create_escalation_ticket(db, employee_id, conversation.id, reason="low_confidence")
        result = _make_escalation_result(ticket)

    result["debug"] = _build_trace(
        predicted_intent, sensitive_category, result["route"], last_tool_name, classify_ms, agent_ms, retrieval_debug
    )
    await _persist(db, conversation, message, result)
    log_turn(conversation.id, employee_id, message, predicted_intent, result["route"], result.get("citations"), result.get("ticket_id"))
    return result


async def _persist(db: AsyncSession, conversation: Conversation, message: str, result: dict) -> None:
    await update_context(
        db, conversation,
        user_message=message,
        assistant_answer=result["answer"],
        route_taken=result["route"],
        chunk_ids=result.get("chunk_ids"),
        citations=result.get("citations"),
        debug_trace=result.get("debug"),
    )