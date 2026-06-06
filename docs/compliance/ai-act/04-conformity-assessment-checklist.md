# Conformity Assessment Readiness Checklist

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

> **Trigger scenarios:** (1) downstream-платформа продає Doc-Hub Agent для **high-risk use case**; (2) Doc-Hub запускає **власний high-risk vertical**.  
> **Platform default today:** Limited Risk — цей checklist = **readiness**, не active conformity process.

---

## 1. Conformity assessment module

### 1.1 Applicable procedure

Згідно з **Article 43(1)** та **Annex VI**, conformity assessment для high-risk AI systems залежить від типу системи та наявності harmonised standards.

| Module | Опис | Застосовність до Doc-Hub |
|--------|------|--------------------------|
| **Module A — Internal control** (Annex VI, Section 2) | Provider проводить internal control; складає EU declaration of conformity; **без** Notified Body для типового software SaaS, якщо застосовано harmonised standards / common specifications (**Article 43(3)**) | **Рекомендований default** для Doc-Hub Risk Agent як software product — за умови QMS-lite + Annex IV completeness |
| **Module H — QMS + technical documentation** (Annex VI, Section 6) | Assessment of QMS by Notified Body + review of technical documentation + consistency check | **Якщо** Module A недоступний (немає harmonised standards) **або** sector law вимагає NB involvement [TBD: Legal Lead] |

### 1.2 Обґрунтування вибору Module A (default)

1. Doc-Hub Risk Agent — **standalone software** AI system, не embedded safety component (**Article 6(1)(b)** N/A).
2. Provider може застосувати **common specifications** або pending harmonised standards для AI management (**ISO/IEC 42001** alignment) — [TBD: formal gap vs harmonised standard list].
3. Module A мінімізує time-to-market для B2B infrastructure, залишаючи **downstream deployer** responsible за context-of-use classification (**Article 25** deployer obligations).
4. Module H reserved для випадку, коли Legal Lead визначить **mandatory NB** для конкретного vertical (e.g. if reclassified under Annex III point 8 with binding legal effect).

**Decision owner:** Legal Lead + [TBD: Notified Body pre-submission call if Module H].

---

## 2. Readiness checklist — Articles 9–17

| Article | Title | Requirement (summary) | Status | Notes |
|---------|-------|----------------------|--------|-------|
| **9** | Risk management system | Continuous iterative process: identify, estimate, evaluate, mitigate risks (**Article 9(2)**) | **GAP** | Heuristics exist (`ConfidencePropagator`); formal risk register missing |
| **10** | Data and data governance | Training/validation/testing data governance; bias examination (**Article 10(2)**–**(5)**) | **GAP** | No customer-data fine-tuning default; bias audit [TBD] |
| **11** | Technical documentation | Annex IV documentation before market placement (**Article 11(1)**) | **GAP** | Draft in [02-annex-iv-technical-documentation.md](./02-annex-iv-technical-documentation.md) — not complete |
| **12** | Record-keeping | Auto logs, traceability (**Article 12(1)**) | **NOT_STARTED** | No `risk_agent_runs` table yet |
| **13** | Transparency to deployers | Instructions for use, capabilities/limitations (**Article 13(3)**) | **GAP** | OpenAPI partial; no formal IFU document |
| **14** | Human oversight | Design for Article 14(4)(a)–(d) | **GAP** | Spec in [03-human-oversight-mechanism.md](./03-human-oversight-mechanism.md); abort/review API missing |
| **15** | Accuracy, robustness, cybersecurity | Appropriate levels + resilience (**Article 15(1)**–**(5)**) | **GAP** | Pytest coverage partial; pen test [TBD] |
| **16** | Provider obligations | QMS elements, corrective actions (**Article 16(1)**) | **NOT_STARTED** | No formal QMS |
| **17** | Quality management system | QMS per **Article 17(1)** | **NOT_STARTED** | ISO 42001 gap assessment [TBD] |

**Summary counts:** READY **0** · GAP **6** · NOT_STARTED **3**

---

## 3. External documents / certificates required

| Document / certificate | Required when | Status |
|------------------------|---------------|--------|
| **EU declaration of conformity** (template §8 in Annex IV doc) | Before high-risk market placement (**Article 47**) | Template only |
| **Notified Body certificate** (Module H) | If Module H selected | **N/A** (default Module A) |
| **ISO/IEC 42001 certificate** | Voluntary / customer requirement | NOT_STARTED |
| **ISO/IEC 27001 certificate** | Customer security due diligence | [TBD] |
| **Penetration test report** | Article 15(5) cybersecurity | NOT_STARTED |
| **Legal opinion** on Annex III classification | Enterprise sales | [TBD: external counsel] |
| **GPAI provider documentation** (OpenAI) | Article 53 deployer duties | PARTIAL — API terms on file [TBD] |

**Notified Body:** [TBD: identify NB with AI Act scope if Module H — не вигадуємо конкретне NB до tender]

---

## 4. CE marking procedure — steps

**Article 48** + **Article 49** (registration):

| Step | Action | Owner | Status |
|------|--------|-------|--------|
| 1 | Confirm high-risk classification + Annex III category | Legal Lead | Pending trigger |
| 2 | Complete Annex IV technical documentation | Tech Lead | Draft |
| 3 | Implement Articles 9–15 measures; close GAPs | Engineering | In progress |
| 4 | Establish / certify QMS (Article 17) | Ops + Legal | NOT_STARTED |
| 5 | Conduct conformity assessment (Module A self-assessment or Module H with NB) | Legal + QA | NOT_STARTED |
| 6 | Sign **EU declaration of conformity** (Article 47) | Authorised signatory | NOT_STARTED |
| 7 | Affix **CE marking** (Article 48(1)) | Product / docs | NOT_STARTED |
| 8 | Register in **EU AI database** (Article 49, **Article 71**) | Regulatory | NOT_STARTED |
| 9 | Post-market monitoring plan active (Article 72) | Compliance | Draft §9 Annex IV |

---

## 5. EU database registration (Article 49)

**Article 49(1):** Providers of high-risk AI systems **shall register** in EU database before placing on market.

### 5.1 Data to submit [per Article 49(2) — high-level]

| Data element | Doc-Hub source |
|--------------|----------------|
| Provider name, address, contact | [TBD: legal entity] |
| Authorised representative (if non-EU) | [TBD] |
| AI system name, type, version | Risk Analysis Agent v0.2.0 |
| Intended purpose | Annex IV §1 |
| Status (on market / recalled) | Operational |
| Certificates / Notified Body ID | N/A (Module A) or [TBD] |
| Member States where placed on market | [TBD] |
| CE marking date | [TBD] |
| Instructions for use (summary) | [TBD: IFU PDF] |
| URL for additional information | docs + API portal |

**Timing:** At least **before** first high-risk placement — not required for current Limited Risk default.

---

## 6. Estimated effort — GAP closure (person-weeks)

> **1 person-week** = 1 FTE × 5 working days. Estimates for planning; refine after Legal Lead review.

| Article | GAP / NOT_STARTED items | Effort (person-weeks) |
|---------|-------------------------|----------------------|
| **9** | Formal risk register, FMEA workshops, testing linkage | **4** |
| **10** | Data governance policy, bias evaluation protocol, dataset docs | **3** |
| **11** | Complete Annex IV, OpenAPI appendix, sign-off | **2** |
| **12** | `risk_agent_runs` migration, log retention policy, immutability | **3** |
| **13** | Instructions for Use (IFU), deployer API docs, limitations | **2** |
| **14** | Abort/review endpoints, UI disclaimer i18n, metrics | **6** |
| **15** | Robustness test suite, adversarial docs, pen test remediation | **5** |
| **16** | Provider obligation playbook, incident process (Article 73) | **2** |
| **17** | ISO 42001 gap → QMS implementation (lite) | **8** |

### 6.1 Total estimated effort

| Metric | Value |
|--------|-------|
| **Sum of GAP effort** | **35 person-weeks** |
| **Parallel team of 2** | ~17.5 calendar weeks |
| **Critical path** | Article 17 (QMS) + Article 14 (oversight) → **14 weeks sequential minimum** [TBD: programme plan] |

### 6.2 Optional add-ons (not in sum)

| Item | Effort |
|------|--------|
| Module H Notified Body engagement | **+6–12** [TBD: NB quote] |
| External legal opinion (Annex III point 8) | **+1** |
| ISO 42001 certification audit | **+4** |

---

## 7. Go / no-go criteria before high-risk launch

- [ ] Legal Lead signed classification for **specific product SKU**
- [ ] All Articles 9–17 at least **GAP → READY**
- [ ] EU declaration signed
- [ ] EU database registration confirmed
- [ ] AUP enforced technically (API scope gates)
- [ ] Post-market monitoring owner assigned

---

[← Повернутися до індексу](./README.md)
