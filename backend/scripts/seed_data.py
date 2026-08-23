"""
Seeds demo data: two employees (one regular, one admin), their HRIS
records, and one sample policy document. Run with:
    python -m scripts.seed_data
"""
import asyncio
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
    async with AsyncSessionLocal() as db:
        employee = Employee(
            id=uuid.uuid4(), employee_code="EMP-1001", name="Jane Doe",
            email="jane.doe@example.com", password_hash=hash_password("demo1234"),
            department="Engineering", country="IN", is_admin=False,
        )
        admin = Employee(
            id=uuid.uuid4(), employee_code="EMP-0001", name="HR Admin",
            email="hr.admin@example.com", password_hash=hash_password("admin1234"),
            department="HR", country="IN", is_admin=True,
        )
        db.add_all([employee, admin])
        await db.flush()

        db.add(HRISRecord(
            id=uuid.uuid4(), employee_id=employee.id, leave_balance_days=15,
            leave_breakdown={"annual": 10, "sick": 5}, enrollment_status="enrolled",
            benefits_plan="Standard Health Plan",
        ))
        await db.commit()

        await ingest_policy_document(
            db, title="Leave and Reimbursement Policy", category="leave",
            source_file="leave_policy.txt", raw_text=SAMPLE_POLICY_TEXT,
        )

        print(f"Seeded employee: {employee.email} / demo1234")
        print(f"Seeded admin:    {admin.email} / admin1234")


if __name__ == "__main__":
    asyncio.run(seed())
