"""
HRIS lookup tool.

NOTE: the make_hris_lookup_tool() wrapper below (a real LangChain @tool)
is currently UNUSED by app/agent/graph.py - live testing against the
deployed gateway showed it does not honor OpenAI-style tool_calls, so the
agent now uses fetch_hris_record() directly inside a manual JSON-action
loop instead of bind_tools/ToolNode. This wrapper is kept in case a
tool-calling-capable gateway/model is used in the future - swap it back
in by following the Example-1 pattern in the reference notebook.

fetch_hris_record's employee_id always comes from the JWT-derived current
employee (see deps.get_current_employee) - never from the LLM's own
output or the user's message - so the agent can never be tricked into
fetching someone else's data via a prompt-injected employee id.
"""
import uuid

from langchain_core.tools import tool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HRISRecord


async def fetch_hris_record(db: AsyncSession, employee_id: uuid.UUID) -> HRISRecord | None:
    """Plain data-access function - used both by the stub API router and the tool below."""
    result = await db.execute(select(HRISRecord).where(HRISRecord.employee_id == employee_id))
    return result.scalar_one_or_none()


def make_hris_lookup_tool(db: AsyncSession, employee_id: uuid.UUID):
    """
    Builds a LangChain tool bound to one specific (db, employee_id) pair.
    Called once per request in graph.py, so each request's tool instance
    can only ever see that request's authenticated employee.
    """

    @tool
    async def hris_lookup(query: str = "") -> str:
        """Look up the current employee's own leave balance, leave breakdown,
        and benefits enrollment status. Takes no employee identifier as input -
        it always returns the authenticated caller's own record. Pass an
        empty string as input."""
        record = await fetch_hris_record(db, employee_id)
        if record is None:
            return "NO_RECORD_FOUND"
        return (
            f"leave_balance_days={record.leave_balance_days}, "
            f"leave_breakdown={record.leave_breakdown}, "
            f"enrollment_status={record.enrollment_status}, "
            f"benefits_plan={record.benefits_plan}"
        )

    return hris_lookup

