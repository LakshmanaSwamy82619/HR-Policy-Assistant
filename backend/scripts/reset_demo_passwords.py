import asyncio

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models import Employee
from app.core.security import hash_password


async def reset_passwords():
    async with AsyncSessionLocal() as db:

        # Reset Employee password
        employee_result = await db.execute(
            select(Employee).where(Employee.email == "swamy@gmail.com")
        )
        employee = employee_result.scalar_one_or_none()

        if employee is None:
            raise RuntimeError("Employee swamy@gmail.com was not found.")

        employee.password_hash = hash_password("swamy123")

        # Reset Admin password
        admin_result = await db.execute(
            select(Employee).where(Employee.email == "demo830@gmail.com")
        )
        admin = admin_result.scalar_one_or_none()

        if admin is None:
            raise RuntimeError("Admin demo830@gmail.com was not found.")

        admin.password_hash = hash_password("admin123")

        await db.commit()

        print("========================================")
        print("Passwords reset successfully")
        print("========================================")
        print("Employee: swamy@gmail.com")
        print("Admin:    demo830@gmail.com")
        print("========================================")


if __name__ == "__main__":
    asyncio.run(reset_passwords())