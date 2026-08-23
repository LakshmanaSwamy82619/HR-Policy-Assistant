from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.logging import configure_logging
from app.routers import (
    auth, chat, hris, escalation, admin_policy, admin_employees,
    admin_tickets, admin_conversations, admin_restore,
)

configure_logging()

app = FastAPI(title="Enterprise HR Policy Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(hris.router)
app.include_router(escalation.router)
app.include_router(admin_policy.router)
app.include_router(admin_employees.router)
app.include_router(admin_tickets.router)
app.include_router(admin_conversations.router)
app.include_router(admin_restore.router)


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok", "env": settings.app_env}
