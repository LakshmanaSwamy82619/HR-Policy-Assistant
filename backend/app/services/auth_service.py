from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models import Employee


async def authenticate_employee(db: AsyncSession, email: str, password: str) -> Employee | None:
    """Returns the Employee if credentials are valid, else None.
    Callers must not leak whether the failure was 'no such email' vs
    'wrong password' — return a single generic auth error either way."""
    result = await db.execute(select(Employee).where(Employee.email == email))
    employee = result.scalar_one_or_none()

    if employee is None or not verify_password(password, employee.password_hash):
        return None

    if not employee.is_active:
        return None

    return employee
