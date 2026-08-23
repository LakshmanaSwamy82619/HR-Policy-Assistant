from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_employee
from app.models import Employee
from app.schemas.auth import LoginRequest, TokenResponse, ChangePasswordRequest
from app.services.auth_service import authenticate_employee
from app.core.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    employee = await authenticate_employee(db, payload.email, payload.password)
    if employee is None:
        # Generic message - never reveal whether the email exists.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    token = create_access_token(str(employee.id))
    return TokenResponse(access_token=token)


@router.patch("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
):
    """Self-service password change - requires the current password, so a
    stolen/left-open session can't silently lock the real owner out. This
    is the change-password path the admin_employees.py docstring notes
    didn't exist yet."""
    if not verify_password(payload.current_password, employee.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect")

    employee.password_hash = hash_password(payload.new_password)
    await db.commit()
