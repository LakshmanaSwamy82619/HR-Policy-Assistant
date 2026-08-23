from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class CreateEmployeeRequest(BaseModel):
    employee_code: str = Field(..., examples=["EMP-1002"])
    name: str
    email: EmailStr
    password: str = Field(..., min_length=8, description="Temporary password - tell the employee to change it via PATCH /auth/me/password after first login.")
    department: Optional[str] = None
    country: Optional[str] = None
    is_admin: bool = False

    # Optional initial HRIS values - an HRIS record is always created so the
    # employee's hris_lookup route works immediately rather than returning
    # NO_RECORD_FOUND until someone backfills it separately.
    leave_balance_days: int = 0
    leave_breakdown: dict = Field(default_factory=dict)
    enrollment_status: str = "pending"
    benefits_plan: Optional[str] = None


class EmployeeResponse(BaseModel):
    id: UUID
    employee_code: str
    name: str
    email: str
    department: Optional[str] = None
    country: Optional[str] = None
    is_admin: bool
    is_active: bool


class UpdateEmployeeRequest(BaseModel):
    """All fields optional - PATCH semantics, only supplied fields change.
    Email/employee_code/password are intentionally not editable here: email
    changes would need re-verification, and password changes already have
    their own dedicated flow (PATCH /auth/me/password) requiring the
    current password, which this admin endpoint should not bypass."""
    name: Optional[str] = None
    department: Optional[str] = None
    country: Optional[str] = None
    is_admin: Optional[bool] = None
    is_active: Optional[bool] = None