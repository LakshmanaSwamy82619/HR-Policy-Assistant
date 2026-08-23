"""
Centralized application configuration.
All values are loaded from environment variables (.env in development).
Nothing here is hardcoded — this is the single source of truth for config.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str

    # Vector store
    vector_dimension: int = 1536

    # LLM / embeddings
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    llm_api_key: str
    # Custom OpenAI-compatible gateway (e.g. https://keygateway1.arshnivlabs.com/v1).
    # Leave unset to hit OpenAI's default endpoint directly.
    llm_base_url: str | None = None

    # Optional LangSmith tracing (langgraph_multi_agent / Agentic_Workflow notebooks pattern)
    langchain_tracing_v2: bool = False
    langchain_api_key: str | None = None
    langchain_project: str = "hr-policy-assistant"

    # Auth
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60

    # RAG tuning
    retrieval_top_k: int = 5
    retrieval_similarity_threshold: float = 0.72

    # App
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


# Single shared settings instance, imported wherever config is needed.
settings = Settings()

# LangSmith tracing (used by langgraph's built-in instrumentation) reads
# these from the process environment, not from our Settings object directly -
# so mirror them in if the user configured tracing.
if settings.langchain_tracing_v2 and settings.langchain_api_key:
    import os
    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGCHAIN_API_KEY", settings.langchain_api_key)
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.langchain_project)
