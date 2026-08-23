"""
Admin-only employee provisioning.

This is the production-appropriate replacement for scripts/seed_data.py -
that script is fine for seeding demo data once, but has no place in an
ongoing production system since editing and re-running a Python script is
not how you'd add real employees. Real deployments would more commonly
sync from the company's actual HRIS/SSO provider automatically, but this
endpoint is the minimal, honest middle ground: a protected admin action
that at least has a documented, auditable path (instead of direct DB
edits), gated by the same is_admin flag already used for policy-document
ingestion in admin_policy.py.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import get_db
from app.deps import get_current_admin
from app.models import Employee, HRISRecord
from app.schemas.admin_employee_schema import CreateEmployeeRequest, EmployeeResponse, UpdateEmployeeRequest

router = APIRouter(prefix="/admin/employees", tags=["admin"])


def _to_response(e: Employee) -> EmployeeResponse:
    return EmployeeResponse(
        id=e.id, employee_code=e.employee_code, name=e.name, email=e.email,
        department=e.department, country=e.country, is_admin=e.is_admin, is_active=e.is_active,
    )


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: CreateEmployeeRequest,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Employee).where(Employee.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An employee with this email already exists")

    existing_code = await db.execute(select(Employee).where(Employee.employee_code == payload.employee_code))
    if existing_code.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An employee with this employee_code already exists")

    employee = Employee(
        employee_code=payload.employee_code,
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        department=payload.department,
        country=payload.country,
        is_admin=payload.is_admin,
        is_active=True,
    )
    db.add(employee)
    await db.flush()  # populates employee.id before we reference it below

    # Always create an HRIS record too, so the new employee's hris_lookup
    # route works immediately instead of returning NO_RECORD_FOUND until
    # someone separately backfills their HR data.
    hris_record = HRISRecord(
        employee_id=employee.id,
        leave_balance_days=payload.leave_balance_days,
        leave_breakdown=payload.leave_breakdown,
        enrollment_status=payload.enrollment_status,
        benefits_plan=payload.benefits_plan,
    )
    db.add(hris_record)

    await db.commit()
    await db.refresh(employee)

    return _to_response(employee)


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Employee))
    employees = result.scalars().all()
    return [_to_response(e) for e in employees]


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: uuid.UUID,
    payload: UpdateEmployeeRequest,
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Edit an employee's profile fields, grant/revoke admin rights, or
    deactivate/reactivate their account. Deactivation takes effect
    immediately - see app/deps.py get_current_employee, which also rejects
    any already-issued token belonging to a deactivated account, not just
    new login attempts."""
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    if employee.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't deactivate your own account")
    if employee.id == admin.id and payload.is_admin is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't revoke your own admin access")

    if payload.name is not None:
        employee.name = payload.name
    if payload.department is not None:
        employee.department = payload.department
    if payload.country is not None:
        employee.country = payload.country
    if payload.is_admin is not None:
        employee.is_admin = payload.is_admin
    if payload.is_active is not None:
        employee.is_active = payload.is_active

    await db.commit()
    await db.refresh(employee)

    return _to_response(employee)
