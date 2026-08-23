"""
Shared dependencies for route handlers: DB session + current authenticated employee.
Centralizing "who is calling" here is what guarantees the HRIS tool can only
ever fetch the caller's own data — every protected route depends on get_current_employee,
never on a client-supplied employee_id.
"""
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_db
from app.models import Employee

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_employee(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Employee:
    employee_id = decode_access_token(token)
    if employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

    result = await db.execute(select(Employee).where(Employee.id == UUID(employee_id)))
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Employee not found")

    if not employee.is_active:
        # Deactivation must take effect immediately, not just block new
        # logins - otherwise a deactivated employee keeps working until
        # their existing JWT happens to expire.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="This account has been deactivated")

    return employee


async def get_current_admin(employee: Employee = Depends(get_current_employee)) -> Employee:
    """Gates /admin/* routes - only employees flagged is_admin may ingest policy docs."""
    if not employee.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return employee
