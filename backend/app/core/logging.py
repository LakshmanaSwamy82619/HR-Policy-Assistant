"""
Structured logging configuration.
Every conversation turn is also persisted to conversation_turns (see
services/conversation_service.py) — this module handles process-level
log output (startup, errors, warnings), not the audit trail itself.
"""
import logging
import sys

from app.config import settings


def configure_logging() -> None:
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        stream=sys.stdout,
    )


logger = logging.getLogger("hr_policy_assistant")
