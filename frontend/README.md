# HR Policy Assistant — Frontend

A React + Tailwind CSS frontend for the Enterprise HR Policy Assistant backend (FastAPI + LangGraph agentic RAG). Built to be the primary interface employees use to ask policy questions, check their own HR record, track escalations, and — for admins — manage the policy knowledge base and employee roster.

## 1. Design direction

The visual identity is built around the backend's core promise: **every policy answer is traced to a cited section**. Rather than a generic "AI chat" look, the assistant's answers surface citations as small **index tabs** — a nod to a binder's section tabs — attached to the bottom of each cited response.

- **Palette:** ink navy (`#14181F`) sidebar/shell, warm paper background (`#F7F5F0`), moss green primary (`#2F6F5E`), amber accent for citations (`#B9812E`).
- **Type:** Fraunces (display/headings), Inter (UI text), IBM Plex Mono (section IDs, ticket IDs, data values).
- **Motion:** restrained — page/element fade-ins, hover lift on cards, a three-dot typing indicator while the agent is "thinking," fade+scale modals. No decorative or unnecessary animation.

## 2. Pages

| Route | Purpose |
|---|---|
| `/login` | Employee sign-in |
| `/chat`, `/chat/:conversationId` | Main assistant — the core screen. Handles RAG answers with citations, HRIS lookups, and escalation notices in one thread |
| `/my-record` | The caller's own HRIS data (leave balance, enrollment, benefits) |
| `/tickets` | Escalation tickets created for the employee, plus manual lookup by ticket ID |
| `/admin/policies` | Admin-only: ingest and browse policy documents (RAG knowledge base) |
| `/admin/employees` | Admin-only: provision employees, view the roster |

## 3. API integration

Every screen maps to a real backend endpoint — nothing here is mocked:

| Screen | Endpoint(s) |
|---|---|
| Login | `POST /auth/login` |
| Chat | `POST /chat`, `GET /chat/{id}/history` |
| My HR record | `GET /hris/me` |
| Tickets | `GET /escalation/tickets/{id}`, `POST /escalation/tickets` |
| Admin → Policies | `GET/POST /admin/policy-documents` |
| Admin → Employees | `GET/POST /admin/employees` |

The API layer lives in `src/services/` — one file per resource, all routed through a shared `api.js` Axios instance that attaches the JWT and normalizes error messages.

### Two intentional gaps in the backend, and how the frontend handles them

The backend has no `GET /auth/me` (so it never returns the caller's name or admin flag) and no "list my conversations" or "list my tickets" endpoints. Rather than inventing endpoints that don't exist, the frontend works within what's actually there:

- **Admin detection:** since there's no role claim, the app makes a single call to the admin-only `GET /admin/employees` right after login; a 200 means admin, a 403 means not. This is cached in `AuthContext` for the session.
- **Conversation & ticket history:** the sidebar's "Recent" list and the Tickets page are backed by a small local index (`localStorage`, scoped per employee) of ids the client has already seen — populated as conversations happen and tickets get created, plus a manual "look up by ID" fallback on the Tickets page. All ticket data displayed is still fetched live from the backend; only the *list of which IDs to check* is local.

## 4. Project structure

```
src/
├── main.jsx, App.jsx        # entry point, routing
├── context/
│   ├── AuthContext.jsx       # token, employee id (from JWT), admin flag
│   └── ConversationsContext.jsx
├── services/                 # one file per backend resource
├── components/                # Button, Input, Card, Modal, AppShell, ChatMessage, ...
├── pages/                      # Login, Chat, MyRecord, Tickets, admin/*
└── utils/                       # clsx helper, local ticket-id tracking
```

## 5. Running it

```bash
npm install
cp .env.example .env       # set VITE_API_BASE_URL if the backend isn't on localhost:8000
npm run dev                 # http://localhost:5173
```

```bash
npm run build                # production build to dist/
npm run preview              # serve the production build locally
```

The backend's CORS `cors_origins` setting must include this frontend's origin (`http://localhost:5173` for local dev).

## 6. Notes for whoever picks this up next

- State is deliberately simple: React context + component state. No Redux — the app doesn't need it at this size.
- Auth token lives in `localStorage` under `hr_assistant_token`; a 401 from any request clears it and the app redirects to `/login` via the Axios response interceptor in `services/api.js`.
- `ProtectedRoute` / `AdminRoute` in `components/ProtectedRoute.jsx` gate access; admin status is re-checked once per session, not per navigation.
- Tailwind tokens (colors, fonts, shadows, animation) are centralized in `tailwind.config.js` — extend there rather than hardcoding one-off values in components.
