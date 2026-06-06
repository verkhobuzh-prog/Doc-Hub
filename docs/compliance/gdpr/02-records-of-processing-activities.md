# Records of Processing Activities (Processor RoPA)

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Legal basis:** **Article 30(2)** GDPR — processor maintains record of all categories of processing carried out on behalf of controller.  
> **Format:** Living document; future auto-generation from Supabase metadata [TBD].

---

## Processor identification

| Field | Value |
|-------|-------|
| **Processor name** | Doc-Hub [TBD: legal entity name] |
| **Address** | [TBD] |
| **DPO contact** | [TBD: dpo@dochub.example] |
| **Representative in EU (if applicable)** | [TBD — Article 27] |

---

## 1. Controller contact details

Per customer (downstream platform). Stored in executed **DPA** + CRM.

| Field | Source |
|-------|--------|
| Controller legal name | DPA Schedule 1 |
| Controller address | DPA |
| Controller DPO / privacy contact | DPA |
| Processing agreement date | DPA effective date |

**Default entry:** `[TBD per customer — see executed DPA]`

---

## 2. Categories of processing on behalf of controller

Doc-Hub performs the following processing **only** on documented instructions (**Article 28(3)(a)**):

### 2.1 Document ingestion & parsing

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Extract text from uploaded files for search and analysis |
| **Data subjects** | Controller's users; natural persons named in documents |
| **Personal data categories** | Names, contact details, contractual roles, identifiers in document text |
| **Storage** | Supabase Storage, `documents`, `document_chunks` |
| **Retention** | Controller-configurable; default [TBD days] until erasure instruction |
| **Reference** | [01-data-flow-mapping.md §1.2](./01-data-flow-mapping.md) |

### 2.2 Embedding generation

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Semantic search (RAG) |
| **Personal data** | **Embeddings = personal data** (EDPB Opinion 28/2024) |
| **Sub-processor** | OpenAI |
| **Storage** | `document_chunks.embedding` (pgvector) |
| **Erasure** | Cascade on chunk/document delete — [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md) |

### 2.3 Knowledge graph construction

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Entity-relationship extraction for reasoning |
| **Personal data** | Person/Organization entities, evidence quotes |
| **Storage** | `semantic_triples`, FalkorDB |
| **Bitemporal** | `valid_from` / `valid_to` — erasure via hard delete + tombstone |

### 2.4 Risk analysis

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Semantic risk scoring, contradiction detection |
| **Personal data** | Indirect — persons in findings, risk scores about entities |
| **AI Act cross-ref** | Limited Risk — [../ai-act/01-classification-analysis.md](../ai-act/01-classification-analysis.md) |
| **Human oversight** | [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md) |
| **DPIA** | [04-dpia-risk-analysis-agent.md](./04-dpia-risk-analysis-agent.md) |

### 2.5 Search & retrieval (RAG)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Answer questions with citations |
| **Personal data** | Query text, retrieved snippets, chat logs |
| **Storage** | `ai_request_logs`, [TBD conversations] |
| **Sub-processor** | OpenAI (completion) |

---

## 3. Transfers to third countries — Article 30(2)(e)

| Sub-processor | Processing | Country | Safeguard |
|---------------|------------|---------|-----------|
| **OpenAI** | Embeddings, chat completion | US (default) / EU (optional) | SCCs + supplementary measures; ZDR |
| **Supabase** | Database, auth, storage | EU [TBD region] | EU — no transfer |
| **FalkorDB** | Graph queries | EU | EU hosting |
| **Render** | Application hosting | EU or US | SCCs if US |
| **Redis** | Cache, queues | [TBD] | SCCs if non-EEA |

**Transfer impact assessment:** [TBD: summary document for OpenAI path]

---

## 4. Technical & organisational measures — Article 32

General description of measures implemented by Doc-Hub:

### 4.1 Encryption

| Layer | Measure | Status |
|-------|---------|--------|
| In transit | TLS 1.2+ (HTTPS API) | Implemented |
| At rest | Supabase encryption; Storage encryption | Provider default [TBD: customer-managed keys] |
| Secrets | Environment variables, no keys in repo | Implemented |

### 4.2 Access control

| Layer | Measure | Reference |
|-------|---------|-----------|
| Authentication | Supabase JWT | `get_current_user` |
| Authorization | Row Level Security (RLS) on `documents`, `document_chunks`, `semantic_triples` | `infra/supabase/migrations/005_rls_hardening.sql` |
| RBAC | Pilot admin, org roles | [TBD: Phase 2 RBAC doc] |
| Service role | Backend `service_role` — bypass RLS | **Gap:** tenant isolation via application logic [TBD: hardening] |

### 4.3 Logging & monitoring

| Layer | Measure | Reference |
|-------|---------|-----------|
| AI requests | `ai_request_logs` table | `002_document_chunks.sql` |
| Application logs | Structured JSON + request ID | [docs/architecture/07-observability-cost.md](../../architecture/07-observability-cost.md) |
| Audit trail (document access) | [TBD: Task 4 compliance module] | Placeholder — future `audit_events` |
| Risk agent runs | [GAP] `risk_agent_runs` | [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md) |

### 4.4 Incident response

| Element | Detail |
|---------|--------|
| Breach notification to controller | **24h** from awareness (DPA) — stricter than **Article 33** 72h to authority |
| Authority notification | Controller responsibility (**Article 33**) |
| Playbook | [TBD: incident-response.md in DPA package] |

### 4.5 Business continuity

| Element | Status |
|---------|--------|
| Backups | Supabase PITR [TBD schedule] |
| Erasure vs backups | 30-day backup aging — [05-right-to-erasure-procedure.md §2](./05-right-to-erasure-procedure.md) |

---

## 5. Maintenance notes — future automation

**Option A — Living Markdown:** Legal updates this file quarterly.

**Option B — Auto-generated RoPA [TBD]:**

```
Sources:
  - subprocessors.yaml (versioned in repo)
  - migration catalog (table list)
  - openapi.json (endpoint inventory)
Output:
  - docs/compliance/gdpr/02-records-of-processing-activities.generated.md
```

**Validation checklist:**

- [ ] Every new Supabase table reviewed for personal data
- [ ] Every new sub-processor triggers DPA Annex update + 30-day notice
- [ ] RoPA synced after ingestion pipeline changes

---

← Back to [README](./README.md)
