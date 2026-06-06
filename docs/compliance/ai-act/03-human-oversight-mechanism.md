# Human Oversight Mechanism — Risk Analysis Agent

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Legal basis:** **Article 14** (human oversight) Regulation (EU) 2024/1689. Застосовується mandatory для high-risk AI systems; Doc-Hub імплементує механізм **proactively** для Limited Risk + downstream readiness.

---

## 1. Article 14(4) — чотири категорії oversight

**Article 14(4)** визначає, що high-risk AI systems мають бути designed so that natural persons exercising oversight can:

### (a) Properly understand relevant capacities and limitations

**Пояснення:** Оператор (людина-експерт) має **розуміти**, що Agent може і **не може** — incl. confidence limits, disputed triples, absence of legal advice.

**Doc-Hub mapping:**

- `explanation` field у risk response (`ConfidencePropagator._RISK_EXPLANATIONS`)
- `ReasoningFinding.description`, `recommendation`, `confidence` per finding
- Provenance API: `GET /api/v1/knowledge/provenance/entity/{entity_name}`

### (b) Remain aware of automation bias tendency

**Пояснення:** Людина не повинна сліпо довіряти «високому score»; UI/API мають **не** створювати false certainty.

**Doc-Hub mapping:** див. §6 Anti-patterns; risk warning у ChatPage when `risk_score > 50`.

### (c) Correctly interpret system output

**Пояснення:** Output має бути **interpretable** — reasoning chain + evidence quotes, не лише число.

**Doc-Hub mapping:**

- `ReasoningFinding.evidence[]` — цитати з документів
- `StreamCitationPayload` / `Citation.evidence` — doc_id, chunk_id, bbox
- Graph compare `summary` + `contradictions[]`

### (d) Decide not to use / override / reverse output

**Пояснення:** Людина може **відхилити** output, зупинити run, зафіксувати своє рішення в audit log.

**Doc-Hub mapping:** dispute triple, abort endpoint (spec), human review workflow (spec).

---

## 2. Design specification — Risk Analysis Agent

### 2.1 Reasoning chain + evidence path (MANDATORY)

Кожен **risk score** MUST супроводжуватись:

| Element | Source in Doc-Hub |
|---------|-------------------|
| Numeric score 0–100 | `ConfidencePropagator.get_risk_score()` |
| Risk level | `low` / `medium` / `high` / `critical` |
| Explanation | `explanation` string |
| Supporting facts | `low_confidence_triples`, `disputed_triples`, `total_triples` |
| Document scope | `analyzed_documents`, `doc_ids` |
| Per-finding evidence | `ReasoningFinding.evidence[]` |

**Architecture reference:** Provenance Layer — `ProvenanceRecord`, `semantic_triples`, [docs/architecture/02-ai-pipeline.md](../../architecture/02-ai-pipeline.md).

### 2.2 `human_review_required: bool`

**Rule (proposed):**

```python
human_review_required = (
    risk_score >= 50
    or risk_level in ("high", "critical")
    or disputed_triples > 0
    or any(f.severity in ("high", "critical") for f in findings)
)
```

**Confidence threshold:** align with `MEDIUM_THRESHOLD=0.5` — якщо median finding confidence < 0.5 → `human_review_required=true`.

**Status:** [GAP] поле ще не в API response — додати у Phase Compliance.

### 2.3 Human reviewer audit fields

Кожен review MUST записуватись:

| Field | Type | Description |
|-------|------|-------------|
| `human_reviewer_id` | UUID | ID професійного користувача (Supabase auth) |
| `reviewed_at` | timestamptz | ISO 8601 UTC |
| `decision` | enum | `approved` / `rejected` / `modified` |
| `decision_notes` | text | Optional free-text |
| `run_id` | UUID | Correlation id agent run |

**Status:** [GAP] — schema у §4 (DDL comments only).

### 2.4 Stop button — abort run

**Requirement:** Operator MUST мати можливість зупинити тривалий analysis run.

**Endpoint (proposed):**

```
POST /api/v1/agents/risk/abort/{run_id}
```

- Sets cancellation flag in Redis / in-memory task registry
- Returns `{ "status": "aborted", "run_id": "...", "aborted_at": "..." }`
- Idempotent: повторний abort → 200 з тим же статусом

**Status:** NOT_IMPLEMENTED — spec only.

### 2.5 UI requirement — disclaimer before display

**Rule:** Risk score **НЕ** показується кінцевому користувачу (natural person) без disclaimer:

> «AI-generated analysis; requires human review by a qualified professional. Not legal advice.»

**Doc-Hub frontend (ChatPage):** вже показує risk warning banner при `risk_score > 50` — розширити текст до повного Article 50 + Article 14 wording [TBD: i18n UK/EN].

---

## 3. API endpoints (FastAPI shape)

### 3.1 Existing endpoints (implemented)

| Method | Path | Returns | Oversight role |
|--------|------|---------|----------------|
| **POST** | `/api/v1/knowledge/risk-analysis` | `{ risk_score, risk_level, explanation, low_confidence_triples, disputed_triples, total_triples, analyzed_documents }` | Primary risk scoring + explanation |
| **POST** | `/api/v1/reasoning/analyze/{doc_id}` | `{ doc_id, findings[], total_findings, risk_score, analyzed_at }` | Contradiction / anomaly findings with evidence |
| **POST** | `/api/v1/reasoning/compare` | `{ documents_analyzed, common_entities, contradictions[], risk_score, summary }` | Cross-document contradiction analysis |
| **GET** | `/api/v1/reasoning/findings/{doc_id}` | Same as analyze | Re-fetch / idempotent read pattern |
| **GET** | `/api/v1/knowledge/provenance/entity/{entity_name}` | `{ entity, sources[], total }` | Evidence path for entity |
| **PATCH** | `/api/v1/knowledge/triples/{triple_id}/dispute` | `{ success, triple_id }` | Human flags incorrect extraction |

### 3.2 Proposed compliance endpoints (NOT IMPLEMENTED)

| Method | Path | Request body | Response |
|--------|------|--------------|----------|
| **POST** | `/api/v1/agents/risk/abort/{run_id}` | — | `{ status, run_id, aborted_at }` |
| **POST** | `/api/v1/agents/risk/review/{run_id}` | `{ decision, decision_notes? }` | `{ run_id, human_reviewer_id, reviewed_at, decision }` |
| **GET** | `/api/v1/agents/risk/audit/{run_id}` | — | `{ run_id, request, response_snapshot, reviews[], aborted? }` |
| **GET** | `/api/v1/agents/risk/metrics` | query: `from`, `to` | `{ override_rate, avg_time_to_review_sec, total_runs }` |

**Auth:** усі endpoints — `Depends(get_current_user)` + document ownership / tenant RBAC.

---

## 4. Database schema — audit trail (DDL comments only)

> **NOT FOR EXECUTION** — design spec for future migration.

```sql
-- Table: risk_agent_runs
-- Purpose: correlate one risk/reasoning execution for Article 14 audit
--
-- id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- user_id         UUID NOT NULL REFERENCES auth.users(id)
-- run_type        TEXT NOT NULL  -- 'risk_analysis' | 'document_analyze' | 'compare'
-- doc_ids         UUID[] NOT NULL DEFAULT '{}'
-- request_payload JSONB NOT NULL
-- response_payload JSONB
-- risk_score      INTEGER
-- risk_level      TEXT
-- human_review_required BOOLEAN NOT NULL DEFAULT false
-- status          TEXT NOT NULL DEFAULT 'running'  -- running|completed|aborted|failed
-- started_at      TIMESTAMPTZ NOT NULL DEFAULT now()
-- completed_at    TIMESTAMPTZ
-- aborted_at      TIMESTAMPTZ
-- created_at      TIMESTAMPTZ NOT NULL DEFAULT now()

-- Table: risk_agent_reviews
-- Purpose: human oversight decisions (Article 14(4)(d))
--
-- id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- run_id              UUID NOT NULL REFERENCES risk_agent_runs(id)
-- human_reviewer_id   UUID NOT NULL REFERENCES auth.users(id)
-- decision            TEXT NOT NULL CHECK (decision IN ('approved','rejected','modified'))
-- decision_notes      TEXT
-- reviewed_at         TIMESTAMPTZ NOT NULL DEFAULT now()

-- RLS: user_id / tenant isolation — [TBD: align with documents RLS pattern]
```

---

## 5. Metrics to monitor

| Metric | Formula / source | Target | Article mapping |
|--------|-------------------|--------|-----------------|
| **Override rate** | `rejected + modified` / `total reviews` | [TBD: baseline after 90 days] | Article 14(4)(d), Article 72 |
| **Time-to-review** | `avg(reviewed_at - completed_at)` | [TBD: e.g. < 24h pilot SLA] | Human oversight effectiveness |
| **Accuracy of reviewed cases** | Sample audit: expert agrees with human decision | [TBD: quarterly sample n=30] | Article 9(2)(e) testing |
| **Dispute rate** | disputed triples / total triples | Trend ↓ after prompt fixes | Data quality |
| **Abort rate** | aborted runs / total runs | Monitor for UX issues | Operator control |
| **Automation bias proxy** | % `approved` without notes when `risk_score >= 50` | Should not → 100% | Article 14(4)(b) |

**Dashboard owner:** Tech Lead + Legal Lead monthly review.

---

## 6. Anti-patterns — automation bias mitigation

### 6.1 НЕ робити (forbidden UI/API patterns)

| Anti-pattern | Чому небезпечно | Alternative |
|--------------|-----------------|-------------|
| Green checkmark «Verified by AI» | Implies human-level verification | «AI-generated draft» badge |
| Hide `disputed_triples` count | Removes doubt signal | Show count + link to dispute UI |
| Sort findings by confidence DESC only | Anchoring on top item | Sort by severity first (already in agent) |
| Auto-apply score to contract status | Removes human decision | Require explicit `review` POST |
| «Confidence: 99%» без evidence | False precision | Show evidence quotes + triple count |
| Disable Stop during long compare | Blocks Article 14(4)(d) | Always show abort |

### 6.2 Recommended UI patterns

1. **Two-step display:** score blurred until user clicks «Show AI analysis» + accepts disclaimer.
2. **Evidence-first layout:** findings list before aggregate score.
3. **Mandatory review checkbox** for downstream when `human_review_required=true`.

---

## 7. Implementation roadmap

| Phase | Deliverable | Status |
|-------|-------------|--------|
| P0 | Document spec (this file) | **DONE** |
| P1 | `human_review_required` in API responses | GAP |
| P2 | `risk_agent_runs` + `risk_agent_reviews` migration | GAP |
| P3 | Abort + review endpoints | GAP |
| P4 | Metrics dashboard | GAP |

---

[← Повернутися до індексу](./README.md)
