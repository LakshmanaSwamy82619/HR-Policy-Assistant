# Requirement Verification — Backend vs. Project Brief

| # | PDF Requirement | Implementation | Status |
|---|---|---|---|
| 1 | Employees ask HR questions in natural language | `POST /chat` accepts free-text `message` | Completed |
| 2 | Agent decides: RAG answer vs. HRIS tool call vs. escalation | `app/agent/graph.py::run_agent_turn` — real LangGraph `StateGraph` where the LLM itself picks between three bound tools via `bind_tools`/`ToolNode`; an explicit `classify_intent_label` node also runs in parallel to produce a labeled prediction for accuracy scoring/audit (see #38) | Completed |
| 3 | Distinguish general policy question from personal-HRIS-data request | The LLM's own tool choice does the actual routing (system prompt instructs when to use `policy_search` vs `hris_lookup`); `classify_intent.py::classify_intent_label` also produces an independent labeled prediction, logged alongside the actual route taken so routing mismatches are visible | Completed |
| 4 | Escalate on low confidence | `rag/confidence.py::is_confident` gate inside the `policy_search` tool (returns `NO_CONFIDENT_MATCH`, prompting the LLM to call `escalate_to_hr`); a post-hoc output-validator safety net also forces escalation if an ungrounded answer slips through; `hris_lookup` similarly signals `NO_RECORD_FOUND` | Completed |
| 5 | Escalate on sensitive topics (harassment, termination, medical leave) regardless of confidence | `guardrails/sensitive_topics.py` hard-rule keyword match, checked **before the LLM is even called** — not left to model judgment | Completed |
| 6 | Avoid hallucinated policy answers on legally sensitive topics | Sensitive-topic hard rule (#5) + output-validator guardrail requiring citations (#8) | Completed |
| 7 | Conversation history preserved; vague follow-ups resolve without repeating context | `services/conversation_service.py` (recent-turns window + rolling LLM summary), persisted via `agent/nodes/context_manager.py` after every graph run | Completed |
| 8 | Every policy answer includes a citation to the source section, for auditability | System prompt forces `[Section {id}]` citations; `guardrails/output_validator.py` rejects uncited answers and triggers escalation instead | Completed |
| 9 | Retrieval groundedness (RAGAS faithfulness / context precision) | Confidence gate + citation-forcing prompt design; `eval/ragas_eval.py` implements the actual `ragas.evaluate()` harness (Faithfulness, LLMContextPrecisionWithReference, LLMContextRecall) against a labeled query set, verified importable/runnable in a clean venv | Partially completed — harness is real and correct, but has never executed against a live LLM/DB (none available in the build sandbox) |
| 10 | Tool-routing accuracy | Genuine LLM tool-choice via `bind_tools`, unit-tested at the message-trace-interpretation level (`test_agent_graph_interpretation.py`); scoring against a labeled query-type set (the actual 35%-weighted rubric measurement) still needs a live LLM run | Partially completed |
| 11 | Context retention across turns | Rolling summary + recent-turns window (#7); multi-turn integration test needs a live LLM to actually exercise the summarization call | Partially completed |
| 12 | FastAPI + Pydantic schemas | Full API in `app/routers/`, schemas in `app/schemas/` | Completed |
| 13 | JWT-based auth for employee identity | `app/core/security.py`, `app/deps.py::get_current_employee` | Completed |
| 14 | PostgreSQL for HRIS mock data and conversation history | `app/models/hris.py`, `conversation.py`; Alembic migrations wired to same DB | Completed |
| 15 | Vector store (pgvector/Chroma) for policy embeddings | `app/models/policy.py::PolicyChunk.embedding` (pgvector column) | Completed |
| 16 | LangChain/LlamaIndex retriever + RAGAS | Retrieval implemented directly via pgvector + OpenAI embeddings, exposed to the agent as a real LangChain `@tool` (`policy_search`); `eval/ragas_eval.py` implements the RAGAS harness (see #9) | Completed for the retrieval/tool integration; RAGAS execution pending live environment |
| 17 | LangGraph agent with conditional routing | Real `StateGraph` + `bind_tools` + `ToolNode`, matching the reference notebook's Example-1 pattern exactly — one assistant node with three bound tools, conditional edges loop tool calls back to the assistant until a final answer. `AgentState` TypedDict threads `messages` through every node | Completed |
| 18 | HRIS lookup tool | `app/agent/tools/hris_tool.py::make_hris_lookup_tool` — a real `@tool` bound per-request to the JWT-derived employee, so the LLM can never fetch another employee's data regardless of what it's prompted with; stub API at `app/routers/hris.py` | Completed |
| 19 | Ticket-escalation tool | `app/agent/tools/escalation_tool.py::make_escalation_tool` — real `@tool`; stub API at `app/routers/escalation.py` | Completed |
| 20 | Rolling conversation memory with summarization for long threads | `services/conversation_service.py::maybe_summarize` | Completed |
| 21 | No hardcoded credentials; env-based config | `app/config.py` (includes `LLM_BASE_URL` for a custom gateway), `.env.example`, `.gitignore` excludes `.env` | Completed |
| 22 | Guardrails: input validation, prompt injection protection, output validation | Output validator (#8); HRIS tool's `employee_id` is bound via closure at graph-build time from the JWT-derived identity — never an LLM-fillable parameter — so prompt injection can't redirect it to another employee | Completed |
| 23 | Error handling (auth failure, DB errors, LLM/vector-store failures) | Auth failures return 401/403 consistently; LLM/gateway call failures (bad API key, unreachable host, timeout) are now caught in `agent/graph.py::run_agent_turn` and escalate to HR with a `system_error` ticket instead of raising a raw 500 — verified with `test_llm_failure_fallback.py`. DB-layer failures (Postgres itself down) still propagate as 500s, since no ticket can be written if the DB is unreachable either | Completed for LLM/gateway failures; DB-outage handling is an accepted limit (see Known Gaps) |
| 24 | Testing: normal + failure cases | 34 passing pytest tests (guardrails, confidence gating, chunking, security, LangGraph message-trace interpretation, logging node, LLM/gateway-failure fallback, API auth-enforcement smoke tests), verified in both the build sandbox and a clean venv built strictly from `requirements.txt` | Completed for unit-level; DB/LLM-dependent integration tests pending live environment |
| 25 | README with setup/architecture/API docs | `README.md` | Completed |

## Architecture Nodes (Overall Architecture section of the concept list)

| # | Node | Implementation | Status |
|---|---|---|---|
| 38 | Intent Classification Node | `app/agent/nodes/classify_intent.py::classify_intent_label` — runs every turn, produces a labeled prediction (policy/personal_data/sensitive), logged for routing-accuracy comparison. Advisory only; does not override the LLM's own tool choice | Completed |
| 39 | RAG Retrieval Node | `app/agent/tools/policy_search_tool.py` — real LangChain `@tool`, called by the agent when it chooses the policy path | Completed |
| 40 | HRIS Tool Node | `app/agent/tools/hris_tool.py` — real LangChain `@tool`, bound per-request to the JWT-derived employee | Completed |
| 41 | Escalation Node | `app/agent/tools/escalation_tool.py` — real LangChain `@tool`, plus the hard-rule sensitive-topic pre-check in `graph.py` that bypasses the LLM entirely for legally sensitive topics | Completed |
| 42 | Context Manager Node | `app/agent/nodes/context_manager.py::update_context` — persists both sides of the turn and triggers rolling summarization | Completed |
| 43 | Response Generation | The LLM's final message in the LangGraph run, after any tool calls resolve | Completed |
| 44 | Logging Node | `app/agent/nodes/logging_node.py::log_turn` — now a distinct node from Context Manager; emits a structured audit line per turn (predicted intent, actual route, routing-match flag, citation count, ticket id) | Completed |



- **RAGAS evaluation harness**: script is real and its imports/API usage are verified in a clean environment, but it has never actually executed — needs a live LLM key + seeded Postgres to produce real scores.
- **Multi-turn context-retention test**: same dependency — needs a live LLM to actually exercise the summarization call end-to-end.
- **Live PostgreSQL**: never connected to a real instance in this build environment — schema, models, and Alembic wiring are correct, but `alembic upgrade head` has never actually been run. You'll need to run the migration + seed script yourself once your DB is reachable (see README §14 "What I could not verify").
- **Resilience/retry logic**: LLM/gateway call failures now gracefully escalate to HR (`system_error` ticket) rather than raising a raw 500 — but there's still no retry/backoff before that escalation kicks in, so a single transient blip escalates immediately rather than retrying once first. If the Postgres database itself is unreachable, nothing can gracefully degrade (can't even write an escalation ticket) — that failure mode still surfaces as a 500. This is an accepted limit, not something addressed yet.
