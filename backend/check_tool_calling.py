"""
Standalone check: does the currently configured LLM (via LLM_API_KEY /
LLM_BASE_URL in .env) actually support native OpenAI-style tool calling?

This is the exact thing that failed before (with the custom gateway) and
forced the manual JSON-action loop in app/agent/graph.py. Run this after
switching to a real OpenAI key to see if tool_calls actually comes back
populated now.

Usage:
    python check_tool_calling.py
"""
import asyncio

from langchain_core.tools import tool
from app.core.llm_clients import get_chat_model


@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return f"It's sunny in {city}."


async def main():
    llm = get_chat_model(temperature=0)
    llm_with_tools = llm.bind_tools([get_weather])

    response = await llm_with_tools.ainvoke(
        "What's the weather like in Paris right now? Use the tool to check."
    )

    print("--- Raw response ---")
    print(f"content: {response.content!r}")
    print(f"tool_calls: {response.tool_calls}")
    print()

    if response.tool_calls:
        print("✅ TOOL CALLING WORKS — the model returned a populated tool_calls list.")
        print("   This means the real LangGraph bind_tools/ToolNode approach")
        print("   would now work, instead of the manual JSON-action loop.")
    else:
        print("❌ TOOL CALLING STILL NOT WORKING — tool_calls is empty.")
        print("   The model ignored the bound tool and just replied in plain text.")
        print("   The manual JSON-action loop in graph.py is still needed.")


if __name__ == "__main__":
    asyncio.run(main())