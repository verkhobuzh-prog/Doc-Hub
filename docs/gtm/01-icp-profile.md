# DocMind OS — ICP Profile (LegalTech Beachhead)

> **Product:** DocMind OS — Cognitive Knowledge Operating System (bitemporal logic, provenance+bbox, confidence propagation)  
> **Goal:** First buyers who close fast, pay, and become reference logos — not TAM fiction.

---

## 1. Beachhead Selection

| Criterion (1–10) | A) In-house Legal, mid-market regulated (EU/UK fintech/insur/health/energy) | B) Boutique M&A / Corporate (10–50 lawyers) | C) Litigation boutiques, complex disputes (10–30) |
|---|---:|---:|---:|
| **Pain** | 8 | **9** | 8 |
| **Budget** | **8** | 6 | 5 |
| **Speed-to-close** | 5 | **8** | 6 |
| **Reference value** | 7 | **8** | 6 |
| **Differentiator fit** | 9 | **10** | 8 |
| **Total** | 37 | **41** | 33 |

**Primary beachhead: B — Boutique M&A / Corporate firms (10–50 lawyers), UK + DACH + Nordics.**

**Secondary: A — In-house legal, mid-market regulated EU/UK** (EU AI Act + confidence propagation play once we have 2–3 firm references).

**Why not C:** Litigation stack is owned by Relativity + Harvey/CoCounsel bundles (~$500–1,500/seat/mo). Our bbox wins on explainability, but buyers expect e-discovery workflow + case law — 12–18 mo cycles, low win rate vs incumbents. **Why not A first:** 9–14 mo procurement, CISO gates; we need firm logos before enterprise in-house DPA marathons.

---

## 2. Primary ICP — Detailed Profile

### 2.1 Firmographics

| Attribute | Target |
|-----------|--------|
| **Size** | 10–50 lawyers; 25–120 FTE total; **£8M–£45M** revenue |
| **Geography** | **UK, Germany, Netherlands, Sweden** — English deal docs + EU regulatory exposure; EU AI Act **Art. 50/52** transparency obligations land **Aug 2026** (GPAI/deployer duties) — in-house clients will ask firms *how* AI was used in diligence |
| **Practice mix** | 60%+ corporate/M&A, 20% commercial, remainder regulatory |
| **Volume** | **8–25 active deals/quarter**; 500–3,000 docs per mid-market DD data room |
| **Compliance** | GDPR, firm ISO 27001 (or client-mandated), client SOC2 requests on subprocessors; **no** full FedRAMP requirement |

### 2.2 Practice / Workflow Profile

- **Work:** Sell-side/buy-side DD, disclosure schedules, SPA/SHA mark-ups, management Q&A logs.
- **Volume:** **2,000–8,000 pages/month** across matters; spikes 72h pre-signing.
- **Pressure:** Deadline-driven (signing date immovable).

| Differentiator | Pain in this ICP |
|----------------|------------------|
| **Bitemporal** | *"What did the data room contain on 14 March vs what counsel concluded on 20 March?"* — post-signing indemnity disputes, disclosure gap allegations |
| **Provenance + bbox** | Client/general counsel demands **page-paragraph citations** in DD reports; audit trail for board minutes |
| **Confidence propagation** | Conflicting reps across NDA vs SPA vs cap table — flag low-trust clauses before partner sign-off |

### 2.3 Current Tech Stack

| Category | Typical | DocMind role |
|----------|---------|--------------|
| DMS | iManage / NetDocuments | **Ingest + cite back to doc_id**; no rip-and-replace |
| CLM | Often none or Agiloft | Complements post-close, not Year 1 wedge |
| Research | Practical Law / Lexis | Stays; DocMind is **transaction docs**, not case law |
| AI trial | Harvey (1–3 seats), Copilot M365, Spellbook (~**$99–199/seat/mo**) | **Displaces** ad-hoc ChatGPT + manual cite-checking; **complements** Harvey on DD depth (bitemporal + bbox Harvey lacks) |
| Comms / ID | Teams + Azure AD | SSO path; Slack alerts on conflict flags |

### 2.4 Procurement Process (boutique firm)

| Step | Duration | Notes |
|------|----------|-------|
| 1. **Trigger** | Day 0 | Lost deal hours / client demanded AI audit trail / partner saw competitor pitch |
| 2. **Shortlist** | Weeks 1–4 | Managing Partner + IT + 1 senior associate; 2–3 vendors |
| 3. **Pilot** | Weeks 5–10 | **1 live matter**, 200+ docs; success = **≥30% associate hours saved**, **100% citations with page/bbox**, **≥1 conflict surfaced** |
| 4. **Security** | Weeks 8–12 (parallel) | ISO 27001/SOC2 report, subprocessor list, **no training on client data**, pen test summary |
| 5. **Legal (firm)** | Weeks 10–14 | DPA, liability cap, IP (outputs to client) |
| 6. **Finance** | Weeks 12–16 | Partner vote; **£15k–£60k ARR** band |
| 7. **Budget cycle** | Apr or Oct partner meetings | Can close mid-year if pilot sponsor = equity partner |

**Average sales cycle: 3–5 months** (fast: 8 weeks; slow: 7 months if client consent needed).

### 2.5 Buying Committee

**CHAMPION — Senior Associate / Counsel (Corporate) or Head of Legal Ops (if ≥30 lawyers)**  
- **KPIs:** Billable efficiency, error rate on DD checklists, partner satisfaction  
- **WIIFM:** Looks innovative without betting firm on Harvey-scale spend; **Time Machine** demo wins partner meeting  
- **Fears:** "Partners won't trust AI" → bbox + confidence scores de-risk; being blamed for wrong cite  

**ECONOMIC BUYER — Managing / Senior Partner (Corporate) or COO**  
- **KPIs:** Revenue per lawyer, realization rate, malpractice risk  
- **ROI:** `(Associates × 12h/wk docs × 48w × £180–£250 cost × 35% saved) − platform` → **8–15×** vs **~£99–£199/seat/mo** (Spellbook band; Harvey enterprise **~£800–1,200/seat/mo** — overkill for 25-lawyer firm)  
- **Approval needs:** Payback **<6 months**, 1 reference call, malpractice insurer comfort letter (optional)

**BLOCKER — IT Manager / outsourced MSP + DPO (fractional)**  
- **Concerns:** Client data residency (EU), model retention, prompt logging, **EU AI Act** deployer documentation  
- **Unlock:** SOC2 Type II, DPA with SCCs, **audit log export**, **confidence propagation graph** for Art. 50 explainability, EU hosting option roadmap

---

## 3. Disqualifiers (Year 1 — do not pursue)

| Segment | Why no |
|---------|--------|
| Solo / 2–5 lawyer shops | **LTV <£5k**; support > revenue |
| AmLaw 100 / Magic Circle | Harvey entrenched; **12–18 mo** security; our ticket dies in infosec |
| US-only, no EU clients | EU AI Act wedge irrelevant |
| Pure litigation / e-discovery | Relativity + CoCounsel bundle; wrong workflow |
| Legal aid / fixed-fee consumer | No DD volume, no bbox need |
| Firms banning all GenAI | No champion; wait for policy change |

---

## 4. Trigger Events (outbound watch list)

1. **EU AI Act** deployer/transparency deadline communication to portfolio clients (**Aug 2026**)  
2. New **Managing Partner Corporate** or **Head of Legal Ops** (first 90 days)  
3. Firm announces **PE investment** or merger of boutiques (integration DD)  
4. Public **disclosure schedule error** or indemnity claim in mid-market deal (sector press)  
5. Job posts: "legal technology" + "knowledge management" + "M&A"  
6. **Series B/C** of fintech/insur client → outside counsel data room scale-up  
7. Competitor firm press release: "AI-powered due diligence"

---

## 5. Anti-ICP Patterns

- **"Send pricing"** with no discovery — no pain articulated  
- Pilot **without named partner sponsor** — dies at week 6  
- **"Match Harvey"** at Spellbook budget — bad fit; walk  
- Request for **unlimited matters Day 1** — services trap  
- **IT insists on on-prem Day 1** — we’re SaaS Phase 1  
- Champion **junior trainee only** — no partner air cover  
- **100% US data, EU lawyers** — residency mismatch; pause

---

## 6. Example Target Accounts (illustrative logos)

| Firm | Profile | Wedge |
|------|---------|-------|
| **Meridian Corporate LLP** (London, 28 lawyers) | Mid-cap PE deals, 12 matters/qtr | Bitemporal DD timeline for portfolio cos |
| **Alpine Deal Advisors** (Munich, 18 lawyers) | DACH Mittelstand M&A | GDPR + bbox citations for GmbH boards |
| **Nordhaven Partners** (Stockholm, 22 lawyers) | Nordic cross-border | Confidence propagation on conflicting SPA schedules |

---

*Owner: GTM · DocMind OS · v1.0 · Word count: ~1,480*
