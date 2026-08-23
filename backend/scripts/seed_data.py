"""
Seeds demo data: two employees (one regular, one admin), their HRIS
records, and one sample policy document.

Run with:
    python -m scripts.seed_data

Required environment variables:
    SEED_EMPLOYEE_PASSWORD
    SEED_ADMIN_PASSWORD
"""

import asyncio
import os
import uuid

from app.database import AsyncSessionLocal
from app.models import Employee, HRISRecord
from app.core.security import hash_password
from app.services.ingestion_service import ingest_policy_document


SAMPLE_POLICY_TEXT = """
1 Overview
This document describes company leave and reimbursement policy.

2 Annual Leave
Full-time employees accrue 18 days of annual leave per year, credited monthly.
Unused leave may be carried over up to a maximum of 10 days into the next year.

3 Sick Leave
Employees are entitled to 10 days of paid sick leave per year.

3.1 Extended Sick Leave
Sick leave beyond 10 days requires a medical certificate and manager approval.

4 Reimbursement
Business travel expenses must be submitted within 30 days with receipts attached.
"""


async def seed():
    employee_password = os.getenv("SEED_EMPLOYEE_PASSWORD")
    admin_password = os.getenv("SEED_ADMIN_PASSWORD")

    if not employee_password:
        raise RuntimeError(
            "SEED_EMPLOYEE_PASSWORD environment variable is not set."
        )

    if not admin_password:
        raise RuntimeError(
            "SEED_ADMIN_PASSWORD environment variable is not set."
        )

    async with AsyncSessionLocal() as db:

        # Regular Employee
        employee = Employee(
            id=uuid.uuid4(),
            employee_code="EMP-1001",
            name="Swamy",
            email="swamy@gmail.com",
            password_hash=hash_password(employee_password),
            department="Engineering",
            country="IN",
            is_admin=False,
        )

        # Admin
        admin = Employee(
            id=uuid.uuid4(),
            employee_code="EMP-0001",
            name="HR Admin",
            email="demo830@gmail.com",
            password_hash=hash_password(admin_password),
            department="HR",
            country="IN",
            is_admin=True,
        )

        db.add_all([employee, admin])
        await db.flush()

        # HRIS record for the regular employee
        db.add(
            HRISRecord(
                id=uuid.uuid4(),
                employee_id=employee.id,
                leave_balance_days=15,
                leave_breakdown={
                    "annual": 10,
                    "sick": 5,
                },
                enrollment_status="enrolled",
                benefits_plan="Standard Health Plan",
            )
        )

        await db.commit()

        # Seed sample policy document
        await ingest_policy_document(
            db,
            title="Leave and Reimbursement Policy",
            category="leave",
            source_file="leave_policy.txt",
            raw_text=SAMPLE_POLICY_TEXT,
        )

        print("========================================")
        print("HR Policy Assistant seed completed")
        print("========================================")
        print(f"Employee: {employee.email}")
        print(f"Admin:    {admin.email}")
        print("========================================")


if __name__ == "__main__":
    asyncio.run(seed())