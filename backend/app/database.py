"""
Database engine and session management.
Uses async SQLAlchemy so the API can serve concurrent requests without
blocking on I/O-bound DB calls.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.config import settings

engine = create_async_engine(settings.database_url, echo=(settings.app_env == "development"))

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()


async def get_db():
    """FastAPI dependency — yields a DB session and guarantees cleanup."""
    async with AsyncSessionLocal() as session:
        yield session
