# Right to Erasure — Technical Procedure

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Legal basis:** **Article 17** GDPR (right to erasure / "right to be forgotten"); **Article 12(3)** response timeline.  
> **Critical:** Embeddings = personal data (EDPB Opinion 28/2024). Bitemporal history + soft-delete **≠** erasure.

---

## 1. Scope

### 1.1 Erasable

| Category | Condition |
|----------|-----------|
| User account + owned documents | Controller or data subject valid **Article 17** request |
| Document chunks + **embeddings** | Always with document erasure |
| Semantic triples + graph nodes | Hard delete when document erased |
| Chat / AI logs linked to user | Per retention policy or erasure request |
| Storage objects (original PDFs) | Delete from Supabase Storage |

### 1.2 Not erasable (or delayed)

| Category | Legal basis |
|----------|-------------|
| Data under **legal hold** (litigation) | **Article 17(3)(e)** — establishment, exercise or defence of legal claims |
| Statutory retention (tax, audit) | **Article 17(3)(b)** — legal obligation [TBD jurisdiction] |
| Anonymised aggregates | **Article 4(1)** — no longer personal data [TBD pipeline] |
| Backup copies | **Article 17** — erased from active systems; aged out of backups (§2.7) |

---

## 2. Cascade delete map

All locations where personal data may reside:

| # | Store | Tables / keys | Erasure method | FK / notes |
|---|-------|---------------|----------------|------------|
| 1 | **Supabase Auth** | `auth.users` | Delete user via Admin API | Cascades to `documents.user_id` if configured |
| 2 | **Supabase Postgres — documents** | `documents` | **Hard DELETE** (not soft `deleted_at` alone) | Current code uses soft delete — **GAP for Article 17** |
| 3 | **Supabase Postgres — chunks + embeddings** | `document_chunks` (incl. `embedding` vector) | **ON DELETE CASCADE** from document | `002_document_chunks.sql`: `references documents(id) on delete cascade` |
| 4 | **pgvector** | Column `document_chunks.embedding` | Deleted with row — **verify no orphan index entries** | CRITICAL — easy to miss in audits |
| 5 | **Semantic triples** | `semantic_triples` | **ON DELETE CASCADE** from `doc_id` | `003_knowledge_graph_metadata.sql` |
| 6 | **FalkorDB** | Person/Organization nodes, edges | Explicit DELETE Cypher by `doc_id` / tenant | No automatic Postgres FK — **application workflow required** |
| 7 | **Supabase Storage** | `documents/{user_id}/{file}` | `storage.objects` delete API | Path convention [TBD] |
| 8 | **Redis** | Cache keys: `doc:{id}`, `embed:{id}`, session | TTL + explicit **DEL** / `FLUSHDB` pattern per tenant on erasure | Accelerate purge beyond TTL |
| 9 | **AI request logs** | `ai_request_logs` | DELETE WHERE `user_id` = ? | May retain anonymised aggregates |
| 10 | **Application logs** | Render / JSON logs | PII scrubbing; retention 30–90 days | Cannot guarantee immediate log purge — disclose in privacy notice |
| 11 | **Audit logs (SOC2)** | [TBD: `audit_events`] | **Tombstone only** — see §3 | Retain `{entity_id, deleted_at, reason}` without PII |
| 12 | **OpenAI** | API processing | Zero Data Retention / no storage — no delete API needed | Confirm contract |

**Minimum data stores in map: 12** (requirement: 5+ — satisfied)

### 2.1 Current schema gap

`documents.deleted_at` soft delete **retains PII** in DB and embeddings — **insufficient for Article 17**. Erasure workflow MUST execute **hard delete** or crypto-shredding.

### 2.2 Bitemporal layer

Columns `valid_from`, `valid_to`, `transaction_time` on `semantic_triples` [TBD: migration 008]:

- **Wrong:** SET `valid_to = now()` while keeping `subject`, `evidence_quote` — history still contains PII
- **Right:** DELETE row content; insert tombstone record without PII (§3)

---

## 3. Bitemporal + Article 17 — tombstone pattern

**Article 17** requires erasure of personal data without undue delay (**Article 17(1)**).

### 3.1 Tombstone record (allowed metadata)

```sql
-- COMMENT ONLY — NOT FOR EXECUTION
-- Table: erasure_tombstones
-- entity_type   TEXT  -- 'document' | 'user' | 'triple_batch'
-- entity_id     UUID  -- original id (not PII itself)
-- deleted_at    TIMESTAMPTZ
-- deleted_by    UUID  -- reviewer/system user id
-- reason        TEXT  -- 'article_17_request' | 'contract_termination'
-- NO subject names, NO evidence_quote, NO embedding vectors
```

**Purpose:** Prove erasure occurred for SOC2/audit without retaining PII.

### 3.2 Tension with audit / SOC2

| Requirement | Resolution |
|-------------|------------|
| SOC2 wants access logs | Log **user_id hash** or internal UUID only; redact document titles post-erasure |
| Article 17 | Delete content; tombstone proves event |
| AI Act oversight audit | Store run metadata without document content [TBD] |

---

## 4. API design proposal

> **NOT IMPLEMENTED** — specification for backlog.

### 4.1 Initiate erasure

```
DELETE /api/v1/users/{user_id}/data
Authorization: Bearer {controller_admin_token}
Body (optional): {
  "scope": "full_account" | "documents_only",
  "document_ids": ["uuid", ...],
  "reason": "article_17_request",
  "legal_hold_override": false
}
Response 202: {
  "request_id": "uuid",
  "status": "queued",
  "estimated_completion": "ISO8601"
}
```

### 4.2 Poll status

```
GET /api/v1/users/{user_id}/erasure-status/{request_id}
Response 200: {
  "status": "queued" | "in_progress" | "completed" | "blocked_legal_hold" | "failed",
  "artifacts_deleted": {
    "documents": 12,
    "chunks": 340,
    "embeddings": 340,
    "triples": 890,
    "falkordb_nodes": 120,
    "storage_objects": 12
  },
  "completed_at": null
}
```

### 4.3 Async workflow

Cross-reference future **Celery** ingestion refactor [TBD]:

1. Queue job `erasure.execute`
2. Cancel active Risk Analysis runs for user (**§7.1**)
3. Delete FalkorDB subgraph
4. Hard DELETE documents (cascade chunks/embeddings/triples)
5. Delete Storage objects
6. Flush Redis keys
7. Write tombstone + `erasure_requests` completion
8. Notify Controller webhook [TBD]

---

## 5. SLA

| Obligation | Timeline |
|------------|----------|
| **Article 12(3)** — respond to data subject | **1 month** (extendable +2 months) |
| **Article 17(1)** — erase without undue delay | As soon as practicable within response period |
| **Doc-Hub internal target** | **14 days** from Controller instruction |
| **Backup aging** | Personal data removed from active store immediately; backups expire within **30 days** |

---

## 6. Erasure log schema (DDL comments only)

```sql
-- NOT FOR EXECUTION — design spec

-- CREATE TABLE public.erasure_requests (
--     id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     user_id         UUID NOT NULL,
--     controller_id   UUID,  -- downstream tenant [TBD]
--     requested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
--     completed_at    TIMESTAMPTZ,
--     status          TEXT NOT NULL DEFAULT 'queued'
--         CHECK (status IN ('queued','in_progress','completed','blocked','failed')),
--     artifacts_deleted JSONB NOT NULL DEFAULT '{}',
--     reason          TEXT NOT NULL,
--     requester       TEXT NOT NULL,  -- 'controller_api' | 'data_subject_via_controller'
--     legal_hold      BOOLEAN NOT NULL DEFAULT false,
--     error_message   TEXT
-- );
```

---

## 7. Edge cases

### 7.1 Erasure during active Risk Analysis run

1. `POST /api/v1/agents/risk/abort/{run_id}` — [TBD, AI Act spec](../ai-act/03-human-oversight-mechanism.md)
2. Mark run cancelled; discard in-memory state
3. Do not persist partial findings to durable stores — or delete if persisted

### 7.2 Erasure of person mentioned in contract (not account holder)

- Data subject is **third party** named in document
- **Controller** is responsible for **Article 17** request assessment
- Doc-Hub assists: redact/remove triples/chunks matching entity [TBD: entity-specific purge API]
- May require partial document redaction vs full delete — Controller instruction

### 7.3 Legal hold conflict

- If `legal_hold = true` on document → **block** erasure
- Return `status: blocked_legal_hold`
- Notify Controller with reason (**Article 17(3)(e)**)

### 7.4 Controller termination

- Full tenant purge — all users + documents under `org_id`
- Same cascade map; DPA §10 timeline

---

## 8. Verification procedure

After erasure job completes, run verification (read-only SQL):

```sql
-- 1. No documents for user
SELECT count(*) FROM documents WHERE user_id = :user_id;
-- Expected: 0

-- 2. No chunks / embeddings
SELECT count(*) FROM document_chunks dc
  JOIN documents d ON d.id = dc.document_id
  WHERE d.user_id = :user_id;
-- Expected: 0 (or query by deleted document ids list)

-- 3. No semantic triples for user's docs
SELECT count(*) FROM semantic_triples st
  WHERE st.doc_id IN (SELECT id FROM documents WHERE user_id = :user_id);
-- Expected: 0

-- 4. Orphan embedding check
SELECT count(*) FROM document_chunks WHERE embedding IS NOT NULL
  AND document_id NOT IN (SELECT id FROM documents);
-- Expected: 0

-- 5. AI logs [optional retention policy]
SELECT count(*) FROM ai_request_logs WHERE user_id = :user_id;
-- Expected: 0 if full erasure
```

**FalkorDB:** `MATCH (n) WHERE n.doc_id IN $ids RETURN count(n)` → 0

**Storage:** list bucket prefix `{user_id}/` → empty

**Sign-off:** Engineering + DPO checklist on `erasure_requests.artifacts_deleted`

---

## 9. Cross-references

| Document | Link |
|----------|------|
| Data inventory | [01-data-flow-mapping.md](./01-data-flow-mapping.md) |
| DPA erasure clause | [03-dpa-template.md §4(g)](./03-dpa-template.md) |
| Human oversight abort | [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md) |

---

← Back to [README](./README.md)
