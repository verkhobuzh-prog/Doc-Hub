# Data Processing Agreement (DPA) Template

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Parties:** **Processor** — Doc-Hub [TBD legal entity]; **Controller** — downstream B2B platform (Customer).  
> **Legal basis:** **Article 28** GDPR; structure aligned with EDPB Standard Contractual Clauses Module 2 concepts (processor obligations).  
> **Not legal advice** — requires Legal Lead review before execution.

---

## 1. Definitions

| Term | Meaning |
|------|---------|
| **Agreement** | Master Terms + this DPA |
| **Controller** | Customer who determines purposes and means of processing personal data |
| **Processor** | Doc-Hub, processing personal data on Controller's documented instructions |
| **Personal Data** | As defined in **Article 4(1)** GDPR |
| **Processing** | As defined in **Article 4(2)** GDPR |
| **Data Subject** | As defined in **Article 4(1)** GDPR |
| **Sub-processor** | Third party engaged by Processor per **Article 28(2)** |
| **Services** | Doc-Hub API, document ingestion, RAG, Risk Analysis Agent |
| **DPA** | This Data Processing Agreement |
| **SCCs** | Standard Contractual Clauses (Commission Implementing Decision) |
| **Supervisory Authority** | Relevant EU/EEA authority per **Article 55** |

---

## 2. Subject matter, duration, nature and purpose

| Field | Content |
|-------|---------|
| **Subject matter** | B2B document intelligence: ingestion, embedding, knowledge graph, RAG, risk analysis |
| **Duration** | Term of Master Agreement + data return/deletion period (§10) |
| **Nature** | Automated parsing, ML inference via sub-processors, storage in EU-primary infrastructure |
| **Purpose** | Enable Controller's legal/compliance workflows over Controller's documents |
| **Personal data scope** | See [01-data-flow-mapping.md](./01-data-flow-mapping.md) and Schedule 2 below |

---

## 3. Categories of data subjects and personal data

### 3.1 Data subjects

- Controller's registered users (lawyers, analysts, admins)
- Natural persons **mentioned in** Controller's uploaded documents (third-party data subjects)

### 3.2 Categories of personal data

Reference: [01-data-flow-mapping.md §1](./01-data-flow-mapping.md)

- Account identifiers (email, name, user ID)
- Document content (may include names, signatures, employment data)
- Derived data: chunks, **embeddings (pgvector)**, semantic triples, graph nodes
- Chat queries and AI responses
- Usage and audit logs

### 3.3 Special categories — Article 9

Controller represents that it either (a) does not upload **Article 9** special category data, or (b) has established **Article 9(2)** exception and documented instructions to Processor.

---

## 4. Obligations of Processor — Article 28(3)

### (a) Process only on documented instructions — Article 28(3)(a)

Processor SHALL process Personal Data **only** on documented instructions from Controller, including regarding transfers (**Article 28(3)(a)**), unless required by Union or Member State law — in which case Processor informs Controller before processing unless prohibited by law.

**Implementation:**

- API scoped to Controller tenant / API keys
- Written change requests for new processing purposes
- Processor may refuse instructions that violate GDPR or AI Act AUP

### (b) Confidentiality — Article 28(3)(b)

Processor ensures persons authorised to process Personal Data are bound by **confidentiality** obligations (**Article 28(3)(b)**) — contractual or statutory.

**Implementation:**

- Employee/contractor NDAs
- Least-privilege access to production
- No customer data in support tickets without redaction [TBD policy]

### (c) Security measures — Article 28(3)(c) + Article 32

Processor implements appropriate **technical and organisational measures** (**Article 32(1)**) — see **Annex B** (Security Measures).

Includes encryption in transit/at rest, RLS, access logging, vulnerability management [TBD: pen test cadence].

### (d) Sub-processors — Article 28(3)(d) + Article 28(2), (4)

Controller provides **general written authorisation** for Sub-processors listed in **Annex A**. Processor SHALL:

- Notify Controller of intended Sub-processor changes **30 days** before engagement (**Article 28(2)**)
- Allow Controller to object on reasonable GDPR grounds
- Impose same data protection obligations on Sub-processors via contract (**Article 28(4)**)

**Current Sub-processors:** 5 — see Annex A.

### (e) Assist with data subject rights — Articles 12–22

Processor SHALL assist Controller, by appropriate **technical and organisational measures**, in fulfilling Controller's obligation to respond to Data Subject requests exercising rights under **Chapter III** (**Article 28(3)(e)**), including:

- **Article 15** access
- **Article 16** rectification
- **Article 17** erasure — [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md)
- **Article 18** restriction
- **Article 20** portability [TBD scope]
- **Article 21** objection

**SLA:** Processor responds to Controller's assistance request within **5 business days**; erasure workflow target **14 days** internal (Controller-facing **30 days** per **Article 12(3)**).

### (f) Assist with security, DPIA, prior consultation — Articles 32–36

Processor SHALL assist Controller with (**Article 28(3)(f)**):

- **Article 32** — security of processing
- **Article 35** — DPIA — template: [04-dpia-risk-analysis-agent.md](./04-dpia-risk-analysis-agent.md)
- **Article 36** — prior consultation with Supervisory Authority [TBD]

Processor provides RoPA excerpt: [02-records-of-processing-activities.md](./02-records-of-processing-activities.md)

### (g) Delete or return data — Article 28(3)(g)

At Controller's choice, Processor SHALL **delete or return** all Personal Data after end of Services, and delete existing copies unless Union law requires storage (**Article 28(3)(g)**).

**Default:** secure deletion per [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md) within **30 days** of termination.

### (h) Audit and inspection — Article 28(3)(h)

Processor makes available to Controller information necessary to demonstrate compliance (**Article 28(3)(h)**) and allows for audits.

**Proposed mechanism:**

- Annual **SOC 2 Type II** report (when available) [TBD]
- Ad-hoc audit: max **once per 12 months**, **30 days** written notice, during business hours, Controller bears cost
- Processor may satisfy via independent third-party audit report

---

## 5. Sub-processors — Annex A

| # | Sub-processor | Purpose | Location | Transfer safeguard |
|---|---------------|---------|----------|-------------------|
| 1 | **OpenAI, LLC** | LLM inference, embeddings | US (default) / EU (optional) | SCCs + supplementary measures; no training on Customer Data |
| 2 | **Supabase, Inc.** | Postgres, Auth, Storage | EU region | EU processing |
| 3 | **FalkorDB** [TBD entity] | Knowledge graph | EU | EU hosting |
| 4 | **Render Services, Inc.** | Application hosting | EU or US (deployment) | SCCs if US |
| 5 | **Redis** (Upstash or self-hosted) | Cache, job queues | [TBD region] | SCCs if non-EEA |

**Sub-processor page:** `https://[TBD]/legal/subprocessors`

---

## 6. Technical & Organisational Measures — Annex B

Non-exhaustive list (expand per [02-records-of-processing-activities.md §4](./02-records-of-processing-activities.md)):

1. TLS encryption for API
2. Supabase RLS tenant isolation
3. JWT authentication
4. Role-based admin access
5. `ai_request_logs` retention [TBD: 90 days]
6. Vulnerability patching [TBD SLA]
7. Employee security training [TBD]
8. **Article 22 / AUP:** Processor contractually prohibits Controller from using Risk Agent output for solely automated decisions with legal/significant effect without human review
9. API disclaimer field on risk responses [TBD implementation]
10. Incident response — **24h** breach notification to Controller

---

## 7. Data breach notification SLA

| Event | Timeline | Responsibility |
|-------|----------|----------------|
| Processor becomes aware of Personal Data breach | Notify Controller within **24 hours** | Processor |
| Controller notifies Supervisory Authority | Within **72 hours** of awareness (**Article 33(1)**) | Controller |
| Controller notifies Data Subjects | Without undue delay if high risk (**Article 34**) | Controller |

Notification includes: nature of breach, categories/approximate numbers, likely consequences, measures taken (**Article 33(3)**).

---

## 8. Liability & indemnity — placeholders

| Clause | Recommendation |
|--------|----------------|
| **Liability cap** | [TBD: mirror Master Agreement — typically 12 months fees] |
| **Excluded damages** | Consequential loss disclaimer per jurisdiction |
| **Indemnity** | Controller indemnifies Processor for unlawful instructions; Processor indemnifies for breach of DPA caused by Processor |
| **Article 82** | Each party liable for damage caused by processing per GDPR |

**[TBD: Legal Lead — jurisdiction-specific drafting]**

---

## 9. Audit rights

As **Article 28(3)(h)** — see §4(h). SOC 2 Type II + one ad-hoc audit/year on 30 days notice.

---

## 10. Term & termination

| Event | Effect |
|-------|--------|
| Master Agreement expiry | DPA terminates |
| Controller termination for cause (Processor breach) | Immediate + deletion instruction |
| Data return | Controller may export via API within **30 days** |
| Deletion | Processor deletes per [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md) |

---

## 11. Governing law & jurisdiction

**Governing law:** [TBD: e.g. laws of Ireland / Netherlands / Poland — Legal Lead]  
**Jurisdiction:** Courts of [TBD]  
**SCCs:** If applicable, SCCs prevail over conflicting DPA terms for transfer matters.

---

## Schedule references

- **Schedule 1:** Controller details [per customer]
- **Schedule 2:** Data categories — [01-data-flow-mapping.md](./01-data-flow-mapping.md)
- **Annex A:** Sub-processors (§5)
- **Annex B:** TOMs (§6)

---

← Back to [README](./README.md)
