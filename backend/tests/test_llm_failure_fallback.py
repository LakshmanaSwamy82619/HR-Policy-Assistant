import uuid
from unittest.mock import AsyncMock, patch

import pytest

from app.agent.graph import run_agent_turn
from app.models import Conversation


class FakeFailingLLM:
    """Simulates a broken API key / unreachable gateway."""

    def bind_tools(self, tools):
        return self

    async def ainvoke(self, messages):
        raise ConnectionError("simulated gateway failure - bad API key or unreachable host")


@pytest.mark.asyncio
async def test_llm_failure_escalates_instead_of_raising():
    fake_db = AsyncMock()
    conversation = Conversation(id=uuid.uuid4(), employee_id=uuid.uuid4())
    conversation.summary = None

    fake_ticket = type("Ticket", (), {"id": uuid.uuid4()})()

    with patch("app.agent.graph.get_chat_model", return_value=FakeFailingLLM()), \
         patch("app.agent.graph.classify_intent_label", new=AsyncMock(return_value="policy")), \
         patch("app.agent.graph.create_escalation_ticket", new=AsyncMock(return_value=fake_ticket)), \
         patch("app.agent.graph.get_recent_turns", new=AsyncMock(return_value=[])), \
         patch("app.agent.graph._persist", new=AsyncMock()), \
         patch("app.agent.graph.log_turn"):

        result = await run_agent_turn(
            db=fake_db,
            employee_id=uuid.uuid4(),
            conversation=conversation,
            message="How many annual leave days do I get?",
        )

    # Must NOT raise - must gracefully escalate to HR instead.
    assert result["route"] == "escalation"
    assert result["ticket_id"] == fake_ticket.id
    assert "system issue" in result["answer"] or "ticket" in result["answer"].lower()