import os

# Provide dummy required settings so app.config.Settings() doesn't fail
# to import during test collection - these are never used to hit a real
# DB or LLM in the unit tests below.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("LLM_API_KEY", "test-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")
