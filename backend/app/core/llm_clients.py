"""
Shared client factories for the LLM and embedding models.

Centralized here so the custom gateway (LLM_BASE_URL) and API key are
applied consistently everywhere - retriever.py, ingestion_service.py,
and the agent all get their clients from this module instead of each
constructing their own with slightly different config.
"""
from openai import AsyncOpenAI
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings


def get_async_openai_client() -> AsyncOpenAI:
    """Raw OpenAI SDK client - used for direct embedding calls."""
    return AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)


def get_chat_model(temperature: float = 0.0) -> ChatOpenAI:
    """LangChain chat model - used by the agent graph for tool-calling."""
    return ChatOpenAI(
        model=settings.llm_model,
        temperature=temperature,
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
    )


def get_langchain_embeddings() -> OpenAIEmbeddings:
    """LangChain embeddings wrapper - used by the RAGAS evaluation harness."""
    return OpenAIEmbeddings(
        model=settings.embedding_model,
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
    )
