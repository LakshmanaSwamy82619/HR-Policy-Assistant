from pydantic import BaseModel


class HRISRecordResponse(BaseModel):
    leave_balance_days: int
    leave_breakdown: dict
    enrollment_status: str
    benefits_plan: str | None = None
