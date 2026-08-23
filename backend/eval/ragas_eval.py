"""
RAGAS evaluation harness for the RAG (policy_search) branch.

Follows the exact pattern from Ragas_Evaluation.ipynb: build SingleTurnSample
objects (question, answer, retrieved_contexts, reference), wrap them in an
EvaluationDataset, and score with Faithfulness / LLMContextPrecisionWithReference
/ LLMContextRecall - the three metrics named in the project brief's rubric
(Retrieval Groundedness, 40% weight).

This is a standalone script, not part of the request path - run it offline
against a labeled eval set to measure retrieval groundedness, as called for
in the brief. Requires a live LLM_API_KEY (and DATABASE_URL if you extend it
to pull real retrieved_contexts from the running app instead of the inline
eval set below).

Usage:
    python -m eval.ragas_eval
"""
import asyncio

from ragas import evaluate, EvaluationDataset
from ragas.dataset_schema import SingleTurnSample
from ragas.metrics import Faithfulness, LLMContextPrecisionWithReference, LLMContextRecall
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper

from app.core.llm_clients import get_chat_model, get_langchain_embeddings
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.confidence import is_confident, filter_confident_chunks
from app.rag.prompt_builder import build_rag_prompt
from app.database import AsyncSessionLocal

# Labeled query set for offline evaluation. Extend this with real HR policy
# questions and their expected ground-truth answers as your policy corpus
# grows - these three cover the "good / partial / should-escalate" spread
# the same way the reference notebook's eval_set does.
EVAL_SET = [
    {
        "question": "How many days of annual leave do I accrue per year?",
        "ground_truth": "Full-time employees accrue 18 days of annual leave per year, credited monthly, "
                        "with up to 10 days carryover into the next year.",
    },
    {
        "question": "How many paid sick days am I entitled to?",
        "ground_truth": "Employees are entitled to 10 days of paid sick leave per year. Sick leave beyond "
                        "10 days requires a medical certificate and manager approval.",
    },
    {
        "question": "By when must I submit travel expense receipts?",
        "ground_truth": "Business travel expenses must be submitted within 30 days with receipts attached.",
    },
]


async def run_pipeline_for_question(question: str) -> dict:
    """Runs retrieval + generation exactly as the live rag flow does
    (including the same per-chunk confidence filter used in
    app/agent/tools/policy_search_tool.py), returning the pieces RAGAS
    needs: answer text and the retrieved context strings."""
    async with AsyncSessionLocal() as db:
        scored_chunks = await retrieve_relevant_chunks(db, question)

        if not is_confident(scored_chunks):
            return {"answer": "Escalated - no confident match.", "contexts": []}

        # Same filter the live app applies before showing chunks to the LLM
        # and citing them - without this, the eval would score a slightly
        # more lenient (unfiltered) pipeline than what users actually hit.
        confident_chunks = filter_confident_chunks(scored_chunks)

        messages = build_rag_prompt(question, None, confident_chunks)
        llm = get_chat_model(temperature=0.2)
        response = await llm.ainvoke([{"role": m["role"], "content": m["content"]} for m in messages])

        return {
            "answer": response.content,
            "contexts": [chunk.content for chunk, _ in confident_chunks],
        }


async def build_ragas_dataset() -> EvaluationDataset:
    samples = []
    for item in EVAL_SET:
        pipeline_result = await run_pipeline_for_question(item["question"])
        samples.append(SingleTurnSample(
            user_input=item["question"],
            response=pipeline_result["answer"],
            retrieved_contexts=pipeline_result["contexts"] or [""],
            reference=item["ground_truth"],
        ))
    return EvaluationDataset(samples=samples)


def main():
    dataset = asyncio.run(build_ragas_dataset())

    ragas_llm = LangchainLLMWrapper(get_chat_model(temperature=0))
    ragas_embeddings = LangchainEmbeddingsWrapper(get_langchain_embeddings())

    metrics = [
        Faithfulness(llm=ragas_llm),
        LLMContextPrecisionWithReference(llm=ragas_llm),
        LLMContextRecall(llm=ragas_llm),
    ]

    result = evaluate(dataset=dataset, metrics=metrics)
    df = result.to_pandas()

    print("=" * 70)
    print("RAGAS RETRIEVAL GROUNDEDNESS EVALUATION")
    print("=" * 70)
    print(df.to_string(index=False))

    metric_cols = [c for c in df.columns if c not in {"user_input", "retrieved_contexts", "response", "reference"}]
    print("\nMean scores:")
    for col in metric_cols:
        print(f"  {col}: {df[col].mean():.4f}")


if __name__ == "__main__":
    main()