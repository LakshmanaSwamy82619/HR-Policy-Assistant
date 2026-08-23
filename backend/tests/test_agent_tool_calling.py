import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.agent.graph import run_agent_turn
from app.models import Conversation


class FakeToolCallingLLM:
    """Stands in for get_chat_model(...).bind_tools(tools) - returns each
    scripted AIMessage in order, one per graph step, simulating a real
    tool-calling-capable model."""

    def __init__(self, ai_messages: list[AIMessage]):
        self._messages = list(ai_messages)

    def bind_tools(self, tools):
        return self

    async def ainvoke(self, messages):
        return self._messages.pop(0)


class InfiniteToolCallingLLM:
    """Always requests another tool call and never finalizes - used to
    verify the graph's recursion limit escalates instead of looping forever."""

    def bind_tools(self, tools):
        return self

    async def ainvoke(self, messages):
        return AIMessage(
            content="",
            tool_calls=[{"name": "policy_search", "args": {"query": "x"}, "id": str(uuid.uuid4())}],
        )


def _fake_chunk(section_id="3", title="Sick Leave", score=0.9):
    chunk = MagicMock()
    chunk.section_id = section_id
    chunk.section_title = title
    chunk.content = "Employees are entitled to 10 days of paid sick leave per year."
    chunk.chunk_metadata = {"document_title": "Leave Policy"}
    chunk.id = uuid.uuid4()
    return (chunk, score)


@pytest.mark.asyncio
async def test_policy_search_then_final_answer_returns_rag_route_with_citations():
    fake_db = AsyncMock()
    conversation = Conversation(id=uuid.uuid4(), employee_id=uuid.uuid4())
    conversation.summary = None

    scripted = FakeToolCallingLLM([
        AIMessage(content="", tool_calls=[{"name": "policy_search", "args": {"query": "sick days"}, "id": "call_1"}]),
        AIMessage(content="You get 10 sick days per year [Section 3]."),
    ])

    with patch("app.agent.graph.get_chat_model", return_value=scripted), \
         patch("app.agent.graph.classify_intent_label", new=AsyncMock(return_value="policy")), \
         patch("app.agent.tools.policy_search_tool.retrieve_relevant_chunks", new=AsyncMock(return_value=[_fake_chunk()])), \
         patch("app.agent.graph.get_recent_turns", new=AsyncMock(return_value=[])), \
         patch("app.agent.graph._persist", new=AsyncMock()), \
         patch("app.agent.graph.log_turn"):

        result = await run_agent_turn(
            db=fake_db, employee_id=uuid.uuid4(), conversation=conversation,
            message="How many sick days am I entitled to?",
        )

    assert result["route"] == "rag"
    assert result["citations"]
    assert result["citations"][0]["section_id"] == "3"


@pytest.mark.asyncio
async def test_no_confident_match_leads_to_escalation():
    fake_db = AsyncMock()
    conversation = Conversation(id=uuid.uuid4(), employee_id=uuid.uuid4())
    conversation.summary = None
    fake_ticket = MagicMock(id=uuid.uuid4())

    scripted = FakeToolCallingLLM([
        AIMessage(content="", tool_calls=[{"name": "policy_search", "args": {"query": "obscure question"}, "id": "call_1"}]),
        AIMessage(content="", tool_calls=[{"name": "escalate_to_hr", "args": {"reason": "low_confidence", "topic_category": ""}, "id": "call_2"}]),
        AIMessage(content="I've escalated this to HR so a team member can help you."),
    ])

    with patch("app.agent.graph.get_chat_model", return_value=scripted), \
         patch("app.agent.graph.classify_intent_label", new=AsyncMock(return_value="policy")), \
         patch("app.agent.tools.policy_search_tool.retrieve_relevant_chunks", new=AsyncMock(return_value=[])), \
         patch("app.agent.tools.escalation_tool.create_escalation_ticket", new=AsyncMock(return_value=fake_ticket)), \
         patch("app.agent.graph.get_recent_turns", new=AsyncMock(return_value=[])), \
         patch("app.agent.graph._persist", new=AsyncMock()), \
         patch("app.agent.graph.log_turn"):

        result = await run_agent_turn(
            db=fake_db, employee_id=uuid.uuid4(), conversation=conversation,
            message="Some question with no policy match",
        )

    assert result["route"] == "escalation"
    assert result["ticket_id"] == fake_ticket.id


@pytest.mark.asyncio
async def test_recursion_limit_escalates_rather_than_looping_forever():
    fake_db = AsyncMock()
    conversation = Conversation(id=uuid.uuid4(), employee_id=uuid.uuid4())
    conversation.summary = None
    fake_ticket = MagicMock(id=uuid.uuid4())

    with patch("app.agent.graph.get_chat_model", return_value=InfiniteToolCallingLLM()), \
         patch("app.agent.graph.classify_intent_label", new=AsyncMock(return_value="policy")), \
         patch("app.agent.tools.policy_search_tool.retrieve_relevant_chunks", new=AsyncMock(return_value=[_fake_chunk()])), \
         patch("app.agent.graph.create_escalation_ticket", new=AsyncMock(return_value=fake_ticket)), \
         patch("app.agent.graph.get_recent_turns", new=AsyncMock(return_value=[])), \
         patch("app.agent.graph._persist", new=AsyncMock()), \
         patch("app.agent.graph.log_turn"):

        result = await run_agent_turn(
            db=fake_db, employee_id=uuid.uuid4(), conversation=conversation,
            message="How many sick days am I entitled to?",
        )

    assert result["route"] == "escalation"
    assert result["ticket_id"] == fake_ticket.id


@pytest.mark.asyncio
async def test_recent_turns_are_injected_into_llm_prompt():
    """Regression test for the context-retention fix: prior turns stored in
    the DB must actually reach the LLM as messages, not just sit unused."""
    fake_db = AsyncMock()
    conversation = Conversation(id=uuid.uuid4(), employee_id=uuid.uuid4())
    conversation.summary = None

    prior_turn_1 = MagicMock(role="user", content="How many sick days am I entitled to?")
    prior_turn_2 = MagicMock(role="assistant", content="You get 10 sick days per year [Section 3].")

    scripted = FakeToolCallingLLM([
        AIMessage(content="", tool_calls=[{"name": "hris_lookup", "args": {"query": ""}, "id": "call_1"}]),
        AIMessage(content="You have 5 sick days left."),
    ])

    captured_messages = []
    original_ainvoke = scripted.ainvoke

    async def capturing_ainvoke(messages):
        captured_messages.append(list(messages))
        return await original_ainvoke(messages)

    scripted.ainvoke = capturing_ainvoke

    fake_record = MagicMock(
        leave_balance_days=15, leave_breakdown={"sick": 5, "annual": 10},
        enrollment_status="enrolled", benefits_plan="Gold",
    )

    with patch("app.agent.graph.get_chat_model", return_value=scripted), \
         patch("app.agent.graph.classify_intent_label", new=AsyncMock(return_value="personal_data")), \
         patch("app.agent.tools.hris_tool.fetch_hris_record", new=AsyncMock(return_value=fake_record)), \
         patch("app.agent.graph.get_recent_turns", new=AsyncMock(return_value=[prior_turn_1, prior_turn_2])), \
         patch("app.agent.graph._persist", new=AsyncMock()), \
         patch("app.agent.graph.log_turn"):

        result = await run_agent_turn(
            db=fake_db, employee_id=uuid.uuid4(), conversation=conversation,
            message="and how many do I have left?",
        )

    first_call_messages = captured_messages[0]
    contents = [m.content for m in first_call_messages]
    assert "How many sick days am I entitled to?" in contents
    assert "You get 10 sick days per year [Section 3]." in contents
    assert result["route"] == "hris"