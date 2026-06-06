# Annex IV — Technical Documentation (Doc-Hub Risk Analysis Agent)

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Призначення:** Добровільний **AI Act Readiness Toolkit** для downstream deployers, які можуть розгортати Doc-Hub Agent у high-risk verticals. Doc-Hub як platform default **не** проходить mandatory Annex IV filing, але надає цей шаблон для conformity assessment chain.

---

## 1. General description of the AI system

### 1.1 Intended purpose

| Поле | Значення |
|------|----------|
| **System name** | Doc-Hub Risk Analysis Agent |
| **Version** | 0.2.0 (platform) / backend API v1 [TBD: semver policy] |
| **Provider** | Doc-Hub *(legal entity name: [TBD])*, github.com/verkhobuzh-prog/Doc-Hub |
| **Intended purpose** | Semantic risk scoring, contradiction detection, legal/compliance reasoning support over user-uploaded B2B documents with mandatory evidence path |
| **Not intended for** | Autonomous legal decisions, judicial outcome determination, credit/employment decisions without human review |
| **End users** | Downstream platform integrators → professional users (lawyers, analysts) |
| **Geographic scope** | EU deployers / EU data subjects [TBD: data residency policy] |

### 1.2 Interaction with hardware / software

- **Runtime:** FastAPI on Linux containers (Docker / [TBD: K8s])
- **Dependencies:** Supabase PostgreSQL, Redis, FalkorDB v4.0.5, OpenAI API
- **Client:** REST JSON over HTTPS; React frontend (optional)

### 1.3 Versions and updates

| Component | Current | Update channel |
|-----------|---------|----------------|
| Backend API | FastAPI `/api/v1/*` | Git tags, semver |
| Risk engine | `ConfidencePropagator`, `GraphReasoningAgent` | Monorepo releases |
| Models | OpenAI `gpt-4o-mini` [TBD: exact model IDs] | Provider API versioning |

**Versioning policy:** [TBD: release notes + breaking change policy — §6]

---

## 2. Detailed description — system architecture

### 2.1 Architecture diagram (logical)

```
┌─────────────┐     HTTPS/JWT      ┌──────────────────────────────────┐
│  Downstream │ ─────────────────► │  FastAPI (Doc-Hub Backend)       │
│  Platform   │                    │  ├─ /knowledge/risk-analysis     │
└─────────────┘                    │  ├─ /reasoning/analyze|compare     │
                                   │  └─ ProvenanceService            │
                                   └──────────┬───────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    ▼                         ▼                         ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │  Supabase    │          │  FalkorDB    │          │  OpenAI API  │
            │  Postgres    │          │  (graph)     │          │  (GPAI)      │
            │  semantic_   │          │  Cypher      │          │  embeddings  │
            │  triples     │          │  reasoning   │          │  + chat      │
            └──────────────┘          └──────────────┘          └──────────────┘
```

### 2.2 References

| Document | Link |
|----------|------|
| **ADR-001** Graph Database Engine | [docs/adr/ADR-001-graph-database-engine.md](../../adr/ADR-001-graph-database-engine.md) |
| **Architectural Passport** | [docs/ARCHITECTURAL_PASSPORT.md](../../ARCHITECTURAL_PASSPORT.md) |
| **C4 Architecture** | [docs/architecture/01-c4-architecture.md](../../architecture/01-c4-architecture.md) |
| **AI Pipeline** | [docs/architecture/02-ai-pipeline.md](../../architecture/02-ai-pipeline.md) |

### 2.3 Computational resources

| Resource | Spec |
|----------|------|
| API latency target | [TBD: p95 SLA] |
| Max documents per risk analysis | 5 (`_MAX_RISK_ANALYSIS_DOCS`) |
| Embedding dimensions | [TBD: OpenAI model dim] |

---

## 3. Data and data governance

### 3.1 Training data

| Question | Answer |
|----------|--------|
| Чи тренує Doc-Hub власні foundation models? | **НІ** — використовує third-party GPAI via API |
| Fine-tuning on customer data? | **НІ** (default) [TBD: enterprise opt-in policy] |
| RAG index data | Customer-uploaded documents only; tenant-isolated |

### 3.2 Input data

- PDF/DOCX uploads → parsed chunks → embeddings in pgvector
- Semantic triples extracted during ingestion (`semantic_triples` table)
- **Provenance:** `ProvenanceRecord` (doc_id, chunk_id, evidence_quote, confidence, validation_status)

### 3.3 Data augmentation / labelling

| Process | Status |
|---------|--------|
| Synthetic augmentation | **Not used** [TBD] |
| Human labelling of triples | Optional `validation_status` field (`auto-extracted` / disputed) |
| Bias mitigation in extraction | [TBD: prompt engineering review + dispute workflow] |

### 3.4 Bias detection and mitigation

- Confidence thresholds: `HIGH_THRESHOLD=0.8`, `MEDIUM_THRESHOLD=0.5` (`confidence.py`)
- Dispute mechanism: `PATCH /api/v1/knowledge/triples/{triple_id}/dispute`
- Risk propagation decay: `DECAY_FACTOR=0.85`

**Gaps:** [TBD: formal bias audit dataset for legal domain Ukrainian/English]

---

## 4. Monitoring, functioning and control

### 4.1 Logging

| Layer | Implementation |
|-------|----------------|
| Request tracing | Request ID middleware [TBD: OTEL span names] |
| Agent runs | `logger.info` у `reasoning.py`, `knowledge.py` |
| Audit trail | [GAP] dedicated `risk_agent_audit` table — див. [03-human-oversight-mechanism.md](./03-human-oversight-mechanism.md) |

### 4.2 Human oversight integration points

- Every `ReasoningFinding` includes `evidence[]`, `confidence`, `recommendation`
- Risk response includes `explanation` string from `ConfidencePropagator`
- Chat RAG attaches `risk_warning` when `risk_score > 50` (frontend threshold)

### 4.3 Performance monitoring

| Metric | Tool |
|--------|------|
| API errors / latency | [TBD: Prometheus / Render logs] |
| Triple dispute rate | Supabase query |
| Override rate (human review) | [GAP] — §5 [03-human-oversight-mechanism.md](./03-human-oversight-mechanism.md) |

---

## 5. Risk management system (Article 9 mapping)

**Article 9** вимагає continuous iterative risk management process для high-risk AI systems.

| Article 9 requirement | Doc-Hub mapping | Status |
|----------------------|-----------------|--------|
| 9(2)(a) Identification and analysis of known and foreseeable risks | Classification doc [01](./01-classification-analysis.md); AUP banned use cases | **PARTIAL** |
| 9(2)(b) Estimation and evaluation of risks | `get_risk_score()` heuristics + severity sorting | **PARTIAL** |
| 9(2)(c) Evaluation of risks from post-market monitoring | [GAP] post-market plan §9 | **NOT_STARTED** |
| 9(2)(d) Adoption of suitable risk management measures | Provenance + human review spec | **PARTIAL** |
| 9(2)(e) Testing | Pytest unit tests [TBD: risk agent integration tests count] | **PARTIAL** |
| 9(2)(f) Documentation | This Annex IV document | **DRAFT** |

**Formal risk register:** [TBD: Legal Lead + Tech Lead joint register]

---

## 6. Changes through the lifecycle

### 6.1 Versioning policy [TBD]

1. **Semantic versioning** for API breaking changes.
2. **Migration scripts** in `infra/supabase/migrations/`.
3. **Change log** entry required for: model swap, confidence threshold change, new detector in `GraphReasoningAgent`.
4. **Re-validation trigger:** any change affecting risk score formula → regression test suite + Legal sign-off.

### 6.2 Current lifecycle stage

| Stage | Status |
|-------|--------|
| Development | Active |
| Pilot production | [TBD: DEPLOY_PILOT.md] |
| Post-market | Not started |

---

## 7. Standards and technical norms applied

| Standard | Application | Status |
|----------|-------------|--------|
| **ISO/IEC 42001:2023** (AI management system) | Target for QMS alignment | [TBD: gap assessment] |
| **NIST AI RMF 1.0** | Risk taxonomy reference | [TBD: mapping spreadsheet] |
| **ISO/IEC 27001** | Information security | [TBD: infra certification] |
| Harmonised standards under AI Act | [TBD: після публікації OJ citations] |

> **Note:** Не цитуємо конкретні harmonised standards до офіційної публікації в Official Journal.

---

## 8. EU declaration of conformity (template — NOT SIGNED)

```
EU DECLARATION OF CONFORMITY (DRAFT — NOT FOR SUBMISSION)

Regulation (EU) 2024/1689 — Artificial Intelligence Act

1. AI system model / name: Doc-Hub Risk Analysis Agent
2. System identifier: [TBD: UUID / product SKU]
3. Provider name and address: [TBD: legal entity]
4. Statement: This declaration is issued under the sole responsibility of the provider.
5. The AI system described above is in conformity with Regulation (EU) 2024/1689
   [ONLY IF high-risk classification confirmed for specific product SKU — TBD]
6. Applied standards: [TBD]
7. Notified body (if applicable): [TBD — N/A for Module A self-assessment]
8. Place and date of issue: ________________  Date: __________
9. Signature: _____________________________  Name: _____________________________
```

**Status:** Template only. Doc-Hub platform default **does not** submit CE marking for Risk Agent.

---

## 9. Post-market monitoring plan

**Article 72** (post-market monitoring for high-risk) — preparatory plan:

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Collect serious incident reports from downstream | Continuous | Support + Legal |
| Monitor dispute/override metrics | Monthly | Tech Lead |
| Review model provider release notes (OpenAI) | On release | Backend Lead |
| Re-run classification if Annex III guidelines change | Quarterly | Legal Lead |
| User feedback on false contradictions | [TBD: feedback API] | Product |

**Reporting channel:** [TBD: compliance@dochub email / ticketing]

**Serious incident definition:** per **Article 3(49)** and **Article 73** [TBD: internal playbook]

---

## 10. Appendices

| Appendix | Content |
|----------|---------|
| A | OpenAPI export `/api/v1/openapi.json` [TBD: automated export] |
| B | Sample risk-analysis JSON response |
| C | Provenance schema (`semantic_triples` columns) |

---

[← Повернутися до індексу](./README.md)
