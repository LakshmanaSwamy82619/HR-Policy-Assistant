from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_current_admin
from app.models import Employee, PolicyDocument
from app.services.ingestion_service import ingest_policy_document

router = APIRouter(prefix="/admin/policy-documents", tags=["admin"])


@router.post("")
async def upload_policy_document(
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    raw_bytes = await file.read()
    raw_text = raw_bytes.decode("utf-8", errors="ignore")

    document = await ingest_policy_document(db, title=title, category=category, source_file=file.filename, raw_text=raw_text)

    return {"id": str(document.id), "title": document.title, "category": document.category, "chunks_created": len(document.chunks)}


@router.get("")
async def list_policy_documents(
    admin: Employee = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PolicyDocument))
    documents = result.scalars().all()
    return [{"id": str(d.id), "title": d.title, "category": d.category, "version": d.version} for d in documents]
