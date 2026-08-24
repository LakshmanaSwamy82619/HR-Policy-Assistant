"""
Verifies that escalation tickets carry the pipeline trace (and, when
LangSmith tracing is enabled, the run id/url) captured at the exact moment
the agent decided to escalate - see app/agent/graph.py and
app/agent/tools/escalation_tool.py.
"""
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.agent.tools.escalation_tool import create_escalation_ticket
from app.agent.graph import run_agent_turn
from app.models import Conversation


@pytest.mark.asyncio
async def test_create_escalation_ticket_stores_trace_fields():
    fake_db = AsyncMock()
    trace = {"predicted_intent": "policy", "route_taken": "escalation"}

    ticket = await create_escalation_ticket(
        fake_db,
        employee_id=uuid.uuid4(),
        conversation_id=uuid.uuid4(),
        reason="low_confidence",
        pipeline_trace=trace,
        langsmith_run_id="abc123",
        langsmith_trace_url="https://smith.langchain.com/o/x/projects/p/y/r/abc123",
    )

    assert ticket.pipeline_trace == trace
    assert ticket.langsmith_run_id == "abc123"
    assert ticket.langsmith_trace_url == "https://smith.langchain.com/o/x/projects/p/y/r/abc123"


@pytest.mark.asyncio
async def test_create_escalation_ticket_defaults_trace_fields_to_none():
    """Callers that don't have a trace yet (e.g. an employee self-escalating
    with no agent run behind it) should still work without one."""
    fake_db = AsyncMock()

    ticket = await create_escalation_ticket(
        fake_db, employee_id=uuid.uuid4(), conversation_id=uuid.uuid4(), reason="low_confidence",
    )

    assert ticket.pipeline_trace is None
    assert ticket.langsmith_run_id is None
    assert ticket.langsmith_trace_url is None


class FakeFailingLLM:
    def bind_tools(self, tools):
        return self

    async def ainvoke(self, messages):
        raise ConnectionError("simulated failure")


@pytest.mark.asyncio
async def test_system_error_escalation_carries_pipeline_trace():
    """The system_error safety net (app/agent/graph.py) must pass a
    pipeline_trace into create_escalation_ticket so HR sees what stage
    failed, not just reason='system_error' with no context."""
    fake_db = AsyncMock()
    conversation = Conversation(id=uuid.uuid4(), employee_id=uuid.uuid4())
    conversation.summary = None

    fake_ticket = type("Ticket", (), {"id": uuid.uuid4()})()
    mock_create = AsyncMock(return_value=fake_ticket)

    with patch("app.agent.graph.get_chat_model", return_value=FakeFailingLLM()), \
         patch("app.agent.graph.classify_intent_label", new=AsyncMock(return_value="policy")), \
         patch("app.agent.graph.create_escalation_ticket", new=mock_create), \
         patch("app.agent.graph.get_recent_turns", new=AsyncMock(return_value=[])), \
         patch("app.agent.graph._persist", new=AsyncMock()), \
         patch("app.agent.graph.log_turn"):

        result = await run_agent_turn(
            db=fake_db,
            employee_id=uuid.uuid4(),
            conversation=conversation,
            message="How many annual leave days do I get?",
        )

    assert result["route"] == "escalation"
    _, kwargs = mock_create.call_args
    assert kwargs["reason"] == "system_error"
    assert kwargs["pipeline_trace"]["predicted_intent"] == "policy"
    assert kwargs["pipeline_trace"]["route_taken"] == "escalation"
    assert "error" in kwargs["pipeline_trace"]
    # Tracing is off in the test env (LANGCHAIN_TRACING_V2 unset), so these
    # should be None rather than raise/hang on a real network call.
    assert kwargs["langsmith_run_id"] is None
    assert kwargs["langsmith_trace_url"] is None