"""
HRIS stub API.

Designed as its own router/service boundary (rather than a direct DB read
inside the agent node) so it behaves like a call to an external HRIS
system - the agent's hris_tool calls through this same data-access path,
keeping the "external system" illusion consistent for the demo while the
data actually lives in our own Postgres.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_employee
from app.models import Employee
from app.schemas.hris import HRISRecordResponse
from app.agent.tools.hris_tool import fetch_hris_record

router = APIRouter(prefix="/hris", tags=["hris"])


@router.get("/me", response_model=HRISRecordResponse)
async def get_my_hris_record(
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    record = await fetch_hris_record(db, employee.id)
    if record is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No HRIS record found for this employee")

    return HRISRecordResponse(
        leave_balance_days=record.leave_balance_days,
        leave_breakdown=record.leave_breakdown,
        enrollment_status=record.enrollment_status,
        benefits_plan=record.benefits_plan,
    )
