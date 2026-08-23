"""
Unit tests for route_after_model - the conditional-edge function that
decides whether the graph loops back to the tools node or ends the turn.
Replaces the old test_agent_graph_interpretation.py, which tested the
manual JSON-action parser that no longer exists now that the agent uses
real LangGraph bind_tools/ToolNode tool calling.
"""
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from app.agent.graph import route_after_model


def test_routes_to_tools_when_model_requests_a_tool_call():
    state = {
        "messages": [
            SystemMessage(content="sys"),
            HumanMessage(content="How many sick days do I get?"),
            AIMessage(content="", tool_calls=[{"name": "policy_search", "args": {"query": "sick days"}, "id": "call_1"}]),
        ]
    }
    assert route_after_model(state) == "tools"


def test_routes_to_end_when_model_gives_a_final_answer():
    state = {
        "messages": [
            SystemMessage(content="sys"),
            HumanMessage(content="How many sick days do I get?"),
            ToolMessage(content="[Section 3] Sick Leave\n10 days per year.", name="policy_search", tool_call_id="call_1"),
            AIMessage(content="You get 10 sick days per year [Section 3]."),
        ]
    }
    from langgraph.graph import END
    assert route_after_model(state) == END


def test_routes_to_end_for_plain_text_reply_with_no_tool_calls():
    state = {
        "messages": [
            SystemMessage(content="sys"),
            HumanMessage(content="Hello"),
            AIMessage(content="Hi there! How can I help you today?"),
        ]
    }
    from langgraph.graph import END
    assert route_after_model(state) == END