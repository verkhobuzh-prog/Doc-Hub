# Ground Truth Audit — Spec vs Code

*Audit date: 2026-05-26 · Method: `git log` / `git status` / `grep` / file existence*

---

## Step 1 — Git activity (command output)

### `git log --oneline -5` — frontend / specs

```
fd47950 fix: final cleanup of DocMind → Doc-Hub references
3f3b2ff fix: restore all project files after accidental git rm --cached
1de7cef chore: remove cached build artifacts from git tracking
b243d82 feat(phase2-month2): intelligence layer complete
9ce7072 feat(phase2-month1): knowledge graph foundation
```

*(Paths: `frontend/src/lib/api.ts`, `App.tsx`, `ChatPage.tsx`, etc. — no commits dedicated to chat.send, wireframes, or demo PDFs.)*

### `git log --oneline -5` — backend chat

```
caee2ab fix: correct logger names and Redis keys after rename
546977d refactor: rename DocMind OS → Doc-Hub across codebase
121802d fix(security): address critical audit findings
b243d82 feat(phase2-month2): intelligence layer complete
1b713a8 feat: Phase 2-3 complete - frontend, profiles, tests
```

### `git status --short` — audit paths

```
 M frontend/src/App.tsx
 M scripts/migration_rename.py
?? docs/demo/
?? docs/frontend/
?? docs/gtm/
?? frontend/src/types/chat.ts
?? frontend/src/components/chat/
?? frontend/src/components/marketing/
?? frontend/src/hooks/useROI.ts
```

### `git ls-files` — untracked audit artifacts

**Empty output** for: `frontend/src/types/chat.ts`, `docs/demo/`, `docs/frontend/`, `docs/gtm/`, `frontend/src/components/chat/`, `frontend/src/hooks/useROI.ts`, `frontend/src/components/marketing/`, `frontend/src/pages/CitationChipDemoPage.tsx`

→ These exist **on disk only**; **not in `HEAD`**.

### `git show HEAD:frontend/src/App.tsx` (committed routes)

```
/documents → DocumentsPage
/chat      → ChatPage
/knowledge, /settings, /profiles, /admin
```

No `/library`, `/time-machine`, `/chat/:conversationId`, `/dev/citation-chip`.

### `git show HEAD:frontend/src/lib/api.ts` (committed chat API)

```
chat.query(...)   — present
chat.stream(...)  — present (raw string yield)
chat.send(...)    — absent
```

---

## Step 2 — Grep evidence

| Pattern | Hits | Verdict |
|---------|------|---------|
| `chat.send` / `streamSend` | 0 in repo | **Not implemented** |
| `ChatStreamEvent` | `frontend/src/types/chat.ts` only (untracked) | **Types only, local** |
| `/library`, `/time-machine`, `DocumentLibrary`, `TimeMachine` | `docs/frontend/WIREFRAMES_AND_SPEC.md` only | **Spec only** |
| `reportlab`, `faker`, `jspdf`, PDF generator scripts | 0 in `*.py/ts/js` | **Not implemented** |
| `api.chat.query` usage | `ChatPage.tsx:50` | **Legacy path in use** |
| `api.chat.stream` usage | 0 in pages | **Dead client API** |
| Backend `query_stream` + SSE | `chat.py`, `rag_service.py` | **Backend shipped (git)** |

---

## Matrix — Spec vs Reality

| # | Feature / artifact | Spec reference | In `HEAD` (git) | On disk (local) | Runtime wired | Status |
|---|-------------------|----------------|-----------------|-----------------|---------------|--------|
| 1 | **`api.chat.send(req)`** | WIREFRAMES §6, planned prompt | ❌ | ❌ | ❌ | **NOT IMPLEMENTED** |
| 2 | **SSE client + `ChatStreamEvent` parser** | `types/chat.ts`, WIREFRAMES §B | ❌ | ⚠️ types only | ❌ (`ChatPage` uses `query`) | **PARTIAL** — legacy `stream()` yields raw strings |
| 3 | **Backend SSE `/api/v1/chat?stream=true`** | WIREFRAMES | ✅ | ✅ | ✅ endpoint | **SHIPPED** — events: `sources`, tokens, `done` (not `ChatStreamEvent` shape) |
| 4 | **`ChatRequest` with `conversation_id`, `as_of_date`** | `types/chat.ts` | ❌ | ⚠️ TS only | ❌ backend schema lacks fields | **SPEC / TYPES ONLY** |
| 5 | **`ChatStreamEvent` union** | `frontend/src/types/chat.ts` | ❌ | ✅ file | ❌ unused | **LOCAL TYPES ONLY** |
| 6 | **`CitationChip` + bbox citations in API** | WIREFRAMES, `types/chat.ts` | ❌ | ✅ components | ❌ backend `Citation` has no bbox | **PARTIAL** — UI demo local; API chunk-level only |
| 7 | **Screen: Document Library `/library`** | WIREFRAMES §A | ❌ | ❌ | ❌ (`/documents` only) | **SPEC ONLY** |
| 8 | **Screen: Chat Interface `/chat/:conversationId`** | WIREFRAMES §B | ❌ | ❌ | ❌ (`ChatPage`, no `:id`) | **SPEC ONLY** |
| 9 | **Screen: Time Machine `/time-machine`** | WIREFRAMES §C | ❌ | ❌ | ❌ | **SPEC ONLY** |
| 10 | **`DashboardLayout` nav update** | WIREFRAMES routing | ❌ | ❌ (still `/documents`) | ❌ | **NOT DONE** |
| 11 | **50 synthetic PDFs generator** | `DEMO_DATASET_SPEC.md` §7 | ❌ | ❌ | ❌ | **SPEC ONLY** — no faker/reportlab/jspdf code |
| 12 | **50 PDF files on disk** | DEMO_DATASET_SPEC appendix | ❌ | ❌ | — | **NOT GENERATED** |
| 13 | **Demo dataset spec doc** | — | ❌ | ✅ `docs/demo/` | — | **LOCAL DOC ONLY** (untracked) |
| 14 | **Wireframes spec doc** | — | ❌ | ✅ `docs/frontend/` | — | **LOCAL DOC ONLY** (untracked) |
| 15 | **GTM docs + Onepager** | — | ❌ | ✅ `docs/gtm/` | — | **LOCAL DOC ONLY** (untracked) |
| 16 | **`ROICalculator` + `useROI`** | marketing task | ❌ | ✅ | ❌ not routed | **LOCAL CODE ONLY** (untracked) |
| 17 | **`/dev/citation-chip` demo route** | CitationChip task | ❌ | ⚠️ `App.tsx` modified | ⚠️ if built locally | **UNCOMMITTED** — not in `HEAD` |

**Legend:** ✅ exists · ❌ absent · ⚠️ partial or uncommitted

---

## False “done” reports — correction

| Agent claim | Actual state |
|-------------|--------------|
| “`api.chat.send()` next step” | Never built; only `query` + raw `stream` in committed `api.ts` |
| “`npm run build` passes for CitationChip” | May pass locally; **chat types + components not in git** |
| “DEMO_DATASET 50 files spec complete” | **Blueprint only** — zero PDFs, zero generator script |
| “Routing `/library`, `/time-machine`” | **Only in WIREFRAMES markdown** — not in `App.tsx` / `DashboardLayout` |
| “SSE streaming integrated” | **Backend yes**; **frontend no** — no parser, no UI consumer |

---

## Recommended build order (post-audit)

1. **Commit or discard** untracked local work (`types/chat.ts`, `components/chat/`, GTM, demo spec).
2. **`api.chat.send()` + `parseChatStream()`** — align with backend SSE event shapes first.
3. **Wire `ChatPage`** → stream + `CitationChip` (after API bbox or adapter).
4. **Routes + layout** — `/library`, `/time-machine`, `/chat/:conversationId`.
5. **Demo PDF pipeline** — script + manifest from `DEMO_DATASET_SPEC.md` (separate epic).

---

## Commands to re-run this audit

```bash
git status --short docs/ frontend/src/types/ frontend/src/components/chat/
git ls-files frontend/src/types/chat.ts docs/demo/ docs/frontend/
grep -R "chat\.send\|streamSend" frontend/
grep -R "library\|time-machine\|DocumentLibrary" frontend/src/
grep -R "reportlab\|faker\|jspdf" scripts/ backend/ frontend/
```

---

*Owner: Engineering · Re-run before each feature sprint*
