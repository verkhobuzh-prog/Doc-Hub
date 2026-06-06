# DPIA — Risk Analysis Agent

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Legal basis:** **Article 35** GDPR; WP29 Guidelines on DPIA (WP 248 rev.01).  
> **Controller:** downstream platform (DPIA owner). **Processor assistance:** Doc-Hub per **Article 28(3)(f)**.  
> **AI Act cross-ref:** [../ai-act/01-classification-analysis.md](../ai-act/01-classification-analysis.md), [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md)

---

## 1. Threshold assessment — чи DPIA mandatory?

**Article 35(1):** Where processing likely to result in **high risk** to rights and freedoms, controller SHALL carry out DPIA.

**Article 35(3)** criteria (indicative):

| Criterion | Applicable? | Analysis |
|-----------|-------------|----------|
| **(a)** Systematic & extensive evaluation of personal aspects including **profiling** (**Article 22(1)**) | **Так** | Risk Agent scores entities/triples derived from documents naming natural persons |
| **(b)** Large scale processing of special categories (**Article 9**) | **Можливо** | Legal contracts may contain sensitive clauses — controller-dependent |
| **(c)** Systematic monitoring of publicly accessible areas | **Ні** | Not applicable |

**WP248 criteria (additional):**

| Criterion | Applicable? |
|-----------|-------------|
| Evaluation/scoring (credit, performance) | **Так** — semantic risk score 0–100 |
| Automated decision with legal/similar effect | **Conditional** — see §5 |
| Sensitive data | **Possible** |
| Innovative technology (AI) | **Так** |
| Cross-border transfers | **Так** — OpenAI |
| Prevent data subjects exercising rights | **No** (if erasure implemented) |

### 1.1 Висновок threshold

| Question | Answer |
|----------|--------|
| **DPIA mandatory/recommended?** | **ТАК — DPIA recommended** (minimum) / **mandatory** for controllers deploying Risk Agent at scale with profiling |
| **Article 35(1) "high risk" to rights (DPIA trigger)?** | **ТАК** — processing **likely** high risk **before mitigations** |
| **Residual risk after mitigations** | **Medium** — not acceptable without mitigations; with full mitigations → **low-medium** [TBD: DPO sign-off] |

> **Note:** DPIA "high risk" trigger ≠ AI Act "high-risk AI system" classification. Doc-Hub AI Act = Limited Risk ([01-classification](../ai-act/01-classification-analysis.md)).

---

## 2. Systematic description of processing

### 2.1 Reference

Full data map: [01-data-flow-mapping.md](./01-data-flow-mapping.md)

### 2.2 Risk Analysis Agent — inputs / outputs

| Stage | Input | Output | Storage |
|-------|-------|--------|---------|
| Triple loading | `semantic_triples`, document scope | Semantic graph | Postgres |
| Reasoning | `GraphReasoningAgent` detectors | `ReasoningFinding[]` (evidence, severity) | API response |
| Risk scoring | Triple confidence, disputes | `risk_score` 0–100, `explanation`, counts | API response |
| RAG integration | Retrieved chunks | `risk_warning` in chat stream | Chat response |

**Endpoints:** `POST /api/v1/knowledge/risk-analysis`, `POST /api/v1/reasoning/analyze/{doc_id}`, `POST /api/v1/reasoning/compare`

**Sub-processor:** OpenAI (indirect — upstream extraction/chat, not direct risk formula)

---

## 3. Necessity and proportionality — Article 35(7)(b)

| Question | Assessment |
|----------|------------|
| **Necessity** | Risk scoring addresses legitimate need to surface contradictions and low-confidence facts in large contract corpora — proportionate **if** human lawyer retains decision |
| **Proportionality** | Processing limited to Controller-uploaded documents; no open-web profiling |
| **Less intrusive alternatives** | Manual review only — disproportionate at scale; keyword rules — insufficient for semantic contradictions |
| **Data minimisation (Article 5(1)(c))** | Extract triples necessary for reasoning; [TBD] redact unrelated PII from graph |
| **Storage limitation (Article 5(1)(e))** | Retention caps + erasure — [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md) |

---

## 4. Risks to rights and freedoms

| Risk ID | Description | Likelihood | Severity | Rights affected |
|---------|-------------|------------|----------|-----------------|
| **R1** | Inaccurate risk score → wrong legal strategy → financial harm | Medium | High | **Article 22**, fair trial in commercial context |
| **R2** | Bias in entity risk (geography, org type proxies) | Medium | Medium | **Article 5(1)(d)** accuracy, discrimination (**Article 21**) |
| **R3** | Cross-tenant leak via vector similarity | Low | Critical | **Article 32**, confidentiality |
| **R4** | Profiling persons named in contracts without awareness | Medium | Medium | **Article 13/14** transparency, **Article 22** |
| **R5** | Over-reliance on AI (automation bias) | High | Medium | Effective remedy, human dignity |
| **R6** | Incomplete erasure — embeddings remain | Medium | High | **Article 17** |

---

## 5. Article 22 analysis — automated decision-making

**Article 22(1):** Data subject has right **not** to be subject to decision based **solely** on automated processing, including profiling, which produces **legal effects** or **similarly significantly affects** them.

### 5.1 Test: "solely automated"?

| Factor | Doc-Hub default | If downstream automates |
|--------|-----------------|-------------------------|
| Human reviews output | **Так** — designed for lawyer review | **Ні** — violation of AUP |
| Human can override | **Так** — dispute triple, reject score | Must be enforced |
| Decision by controller | Controller's lawyer decides | Automated gate = **solely automated** |

**Verdict (Doc-Hub platform design):** **Article 22(1) NOT triggered** for processing **as designed** — human professional in the loop.

### 5.2 Test: "legal or similarly significant effects"?

If downstream uses score to: deny contract, terminate employment reference, credit-like assessment → **similarly significant effect** likely (**Article 22(1)**).

**Doc-Hub AUP:** **prohibited** — contractual warranty in [03-dpa-template.md §Annex B.8](./03-dpa-template.md).

### 5.3 CJEU Schufa C-634/21 implications

**Schufa** (credit scoring): scoring that **strongly influences** human decision can fall under **Article 22** even if human formally decides — if human follows recommendation without meaningful assessment.

**Implication for Doc-Hub:**

- Risk score MUST NOT be presented as authoritative "pass/fail"
- UI/API MUST require explicit human acknowledgment
- Downstream MUST NOT auto-route workflows on score alone

**Verdict with Schufa lens:** If downstream treats score as deterministic input → **Article 22 APPLIES** — Controller liability; Processor assists via AUP + technical disclaimers.

### 5.4 Article 22(3) safeguards (when 22(1) applies)

If applicable, controller must ensure: right to human intervention, express views, contest decision (**Article 22(3)**). Doc-Hub supports via review endpoints [TBD] — [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md).

---

## 6. Mitigation measures

Cross-reference AI Act human oversight: [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md)

### Mitigation 1 — AUP + DPA prohibition on solely automated legal decisions

- **Article 22** + **Article 28(3)(a)** documented instruction boundary
- Contractual clause: Controller SHALL NOT use Risk Agent for **Article 22(1)** decisions without **Article 22(3)** safeguards
- **Enforcement:** account suspension on breach [TBD]

### Mitigation 2 — Confidence threshold + `human_review_required` flag

- When `risk_score >= 50`, disputed triples > 0, or severity high/critical → **`human_review_required: true`**
- API blocks downstream "auto-apply" webhooks without review record [TBD]
- Reference: [../ai-act/03-human-oversight-mechanism.md §2.2](../ai-act/03-human-oversight-mechanism.md)

### Mitigation 3 — Audit log of every risk score generation

- Table `risk_agent_runs` — request/response snapshot, user_id, timestamp
- Enables accountability (**Article 5(2)**) and breach investigation (**Article 33**)
- Reference: [../ai-act/03-human-oversight-mechanism.md §4](../ai-act/03-human-oversight-mechanism.md)

### Additional mitigations

| # | Measure | Addresses |
|---|---------|-----------|
| 4 | Tenant isolation — filter embeddings by `org_id` / `user_id` pre-similarity search | R3 |
| 5 | Disclaimer: `"AI-assisted analysis; not legal advice; requires human review"` in every risk response | R1, R5, **Article 50** |
| 6 | Cascade delete embeddings on erasure — [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md) | R6, **Article 17** |
| 7 | Bitemporal erasure = tombstone without PII — not soft-delete history | R6 |

---

## 7. Consultation with DPO

| Item | Status |
|------|--------|
| DPO consulted | [ ] Yes / [ ] No |
| Date | [TBD] |
| DPO opinion summary | [TBD: уточнити в DPO] |
| Supervisory authority consultation (**Article 36**) | [TBD — if residual high risk remains] |

---

## 8. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Controller representative** | [TBD] | | |
| **Controller DPO** | [TBD] | | |
| **Processor (Doc-Hub) contact** | [TBD] | | |
| **Review cycle** | Annual or on material change to Risk Agent | | |

---

## 9. Article 22 explicit verdict (summary box)

| Test | Result |
|------|--------|
| Solely automated decision? | **НІ** (as designed — human lawyer decides) |
| Similarly significant effect? | **ТАК** — if downstream misuses; **НІ** — if compliant review |
| Schufa-style influential scoring? | **RISK** — mitigated by AUP + disclaimers + human_review flag |
| **Overall Article 22 compliance path** | **Conditional compliance** — depends on Controller + Doc-Hub AUP enforcement |

**Three mandatory mitigations:** (1) AUP/DPA automation ban, (2) `human_review_required`, (3) audit log per score run.

---

← Back to [README](./README.md)
