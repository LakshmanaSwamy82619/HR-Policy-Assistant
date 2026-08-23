# Enterprise HR Policy Assistant — Backend

An agentic RAG chatbot for HR self-service. Employees ask HR questions in natural language; the agent decides whether to answer from policy documents (RAG), fetch live personal data (HRIS tool call), or escalate to a human HR representative.

## 1. Project Overview

HR departments field hundreds of repetitive policy questions weekly (leave, benefits, compliance, reimbursement). This assistant lets employees self-serve through a chatbot that:
- Answers general policy questions using retrieval-augmented generation over indexed policy documents, always with a citation to the source section.
- Answers personal questions ("how many sick days do I have left?") by calling a live HRIS lookup, scoped strictly to the authenticated employee.
- Escalates to a human HR rep when confidence is low, or immediately for legally sensitive topics (harassment, termination, medical leave) regardless of confidence.
- Preserves conversation memory so follow-up questions resolve without the employee repeating context.

## 2. Problem Statement

See `01_HR_Policy_Assistant.pdf` (project brief). Evaluation rubric: Retrieval Groundedness (40%), Tool-Routing Accuracy (35%), Context Retention (25%).

## 3. Features

- JWT-authenticated employee chat endpoint with full conversation history
- Section-aware policy document ingestion (chunking respects policy section headers so citations are meaningful)
- pgvector-based semantic retrieval with a similarity-threshold confidence gate
- Hard-rule sensitive-topic escalation (independent of retrieval confidence)
- Output guardrail: an ungrounded (uncited) RAG answer is never returned to the employee
- Rolling conversation summarization for long threads
- Stub HRIS and escalation-ticket APIs (mock data in Postgres, exposed as if external)
- Admin-only policy document ingestion endpoint

## 4. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| API | FastAPI + Pydantic | async, typed, fast to iterate, strong OpenAPI docs out of the box |
| Auth | JWT (python-jose) + bcrypt | stateless, standard, scopes every request to one employee |
| Database | PostgreSQL | relational integrity for employees/conversations/tickets |
| Vector store | pgvector (same Postgres instance) | avoids a second infra dependency for the coursework scope |
| Embeddings/LLM | OpenAI (`text-embedding-3-small`, `gpt-4o-mini`) | reliable, cheap, easy to swap via config |
| Agent orchestration | LangGraph `StateGraph` + `bind_tools` + `ToolNode` | matches the reference notebook pattern exactly — one assistant node, three bound tools (policy_search, hris_lookup, escalate_to_hr), conditional edges loop tool calls back to the assistant |
| Migrations | Alembic | standard for SQLAlchemy schema evolution |
| Testing | pytest | unit tests for all pure-logic guardrails/RAG components + FastAPI TestClient smoke tests |

## 5. Architecture

```
Employee (JWT) → FastAPI /chat → Intent Classification
                                     ├─ Sensitive topic → Escalation → Ticket
                                     ├─ Personal data   → HRIS tool  → Live record
                                     └─ Policy question → RAG retrieval → Confidence gate → LLM (cited)
                                                                              └─ low confidence → Escalation
                 → Context Manager (persist turn, summarize if long)
                 → Response { answer, route_taken, citations | ticket_id }
```

Full request/RAG/agent flow diagrams are in the Phase 2 architecture notes (see project chat history / `docs/` if exported).

## 6. Project Structure

```
app/
├── main.py                # FastAPI app + router registration
├── config.py               # env-driven settings
├── database.py             # async SQLAlchemy engine/session
├── deps.py                  # get_current_employee / get_current_admin
├── models/                  # SQLAlchemy models (7 tables)
├── schemas/                 # Pydantic request/response models
├── routers/                 # auth, chat, hris, escalation, admin_policy
├── services/                 # auth, conversation memory, document ingestion
├── rag/                       # retriever, prompt builder, confidence gate
├── agent/
│   ├── graph.py               # orchestration
│   ├── nodes/                 # classify_intent, rag_node, hris_node, escalation_node, context_manager
│   └── tools/                 # hris_tool, escalation_tool
├── guardrails/                # sensitive_topics, output_validator
└── core/                       # security (JWT/hashing), logging
migrations/                     # Alembic
scripts/seed_data.py             # demo employees + sample policy doc
tests/                            # pytest suite
```

## 7. Database Schema

7 tables: `employees`, `hris_records`, `policy_documents`, `policy_chunks` (with pgvector `embedding` column), `conversations`, `conversation_turns`, `escalation_tickets`. Full column-level design was worked out in Phase 3 of the build (see chat history).

## 8. Vector Database Setup

Uses `pgvector` as a Postgres extension — no separate vector DB service required.

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run this once against your Postgres instance before the first Alembic migration.

## 9. Environment Variables

Copy `.env.example` to `.env` and fill in:

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/hr_policy_assistant
LLM_API_KEY=<your key>
JWT_SECRET_KEY=<generate a strong random secret>
```

### Using a custom OpenAI-compatible gateway
If you're routing LLM/embedding calls through a gateway (e.g. Arshniv Labs' `keygateeway1.arshnivlabs.com`) instead of hitting OpenAI directly, set:

```
LLM_BASE_URL=https://keygateeway1.arshnivlabs.com/v1
LLM_API_KEY=<the key your gateway issues>
```

This is applied everywhere a model is called — `app/core/llm_clients.py` is the single place that builds every OpenAI/LangChain client, so the gateway config only needs to be set once. Leave `LLM_BASE_URL` blank to call OpenAI's default endpoint.

Never commit `.env` — it's git-ignored.

## 10. Installation

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in real values
```

## 11. Database Setup & Migrations

```bash
# one-time: enable pgvector on your Postgres instance
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# generate and apply the initial migration
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

# seed demo data (2 employees + 1 sample policy doc)
python -m scripts.seed_data
```

## 12. Running the Backend

```bash
uvicorn app.main:app --reload
```

API docs available at `http://localhost:8000/docs`.

## 13. API Reference

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/login` | Issue JWT | None |
| POST | `/chat` | Main agent entrypoint | JWT |
| GET | `/chat/{conversation_id}/history` | Fetch turn history | JWT |
| GET | `/hris/me` | Fetch caller's HRIS record (stub API) | JWT |
| POST | `/escalation/tickets` | Create escalation ticket (stub API) | JWT |
| GET | `/escalation/tickets/{id}` | Check ticket status | JWT |
| POST | `/admin/policy-documents` | Ingest a policy document | JWT (admin) |
| GET | `/admin/policy-documents` | List ingested documents | JWT (admin) |
| GET | `/health` | Health check | None |

## 14. Testing

```bash
pytest tests/ -v
```

34 tests covering: sensitive-topic detection, output-guardrail validation, confidence-threshold gating, section-aware chunking, JWT/password security, LangGraph message-trace interpretation, the logging node, LLM/gateway-failure fallback to escalation, and full-app route/auth-enforcement smoke tests. Verified passing both in the build sandbox and in a clean venv built strictly from `requirements.txt` (no live Postgres/LLM connection was available in either — see note below).

### RAGAS Evaluation (Retrieval Groundedness)

```bash
python -m eval.ragas_eval
```

Runs the labeled query set in `eval/ragas_eval.py` through the actual retrieval + generation pipeline, then scores it with `Faithfulness`, `LLMContextPrecisionWithReference`, and `LLMContextRecall` — the exact metrics named in the project brief's rubric. Requires a live `DATABASE_URL` (with the seed data ingested) and a working `LLM_API_KEY`/`LLM_BASE_URL`. Extend `EVAL_SET` with more labeled questions as your policy corpus grows.

### What I could not verify in this build environment
This backend was built and tested in a sandbox with **no live PostgreSQL instance and no real LLM API key** — so the following are implemented and unit-tested at the logic level, but not yet exercised end-to-end:
- Actually running `alembic upgrade head` against a real Postgres + pgvector instance
- A real `/chat` request hitting the LangGraph agent, calling a tool, and returning a live LLM answer
- The RAGAS harness actually producing scores (the script is correct against the `ragas==0.2.8` API — verified via a clean install — but has never executed against a live key)
- Multi-turn context retention and conversation summarization with a real LLM

Once you plug in your Postgres URL and gateway key, run:
```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
python -m scripts.seed_data
uvicorn app.main:app --reload
python -m eval.ragas_eval
```
and you'll have closed every one of these gaps yourself.

## 15. Example Request/Response

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jane.doe@example.com", "password": "demo1234"}'
```

```bash
curl -X POST http://localhost:8000/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message": "How many sick days do I have left?"}'
```

```json
{
  "conversation_id": "…",
  "answer": "You have 5 day(s) of leave remaining...",
  "route_taken": "hris",
  "citations": null,
  "ticket_id": null
}
```

## 16. Team Development Notes

- Do not hardcode secrets — everything routes through `app/config.py`.
- New agent behavior belongs in `app/agent/nodes/`, wired into `app/agent/graph.py`.
- New guardrails belong in `app/guardrails/`.
- Run `alembic revision --autogenerate` after any model change in `app/models/`.
