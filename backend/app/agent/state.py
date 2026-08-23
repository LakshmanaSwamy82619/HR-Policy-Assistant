"""
Agent state definition.

Mirrors the Example1State/Example2State TypedDict pattern from
Agentic_Workflow_Langgraph_Langsmith.ipynb - messages accumulate via
operator.add across node calls, which is what lets ToolNode append tool
results and have them show up on the next LLM turn automatically.
"""
import operator
from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
