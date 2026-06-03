# DocMind OS — Competitive Matrix

*Last updated: May 2026*  
*Shipped = in production codebase today. Roadmap/GTM ≠ ✅.*

---

## 0. TL;DR

DocMind **leads on design** for temporal graph queries, knowledge-graph confidence propagation, and mid-market pricing transparency—but **ships Partial** on end-user bitemporal chat, pixel-bbox citations, and EU AI Act packs. Harvey wins BigLaw depth; Glean wins connector breadth; Ironclad wins CLM; Copilot wins bundled M365 productivity at **~$30/user/mo** ([Microsoft pricing](https://www.microsoft.com/en-us/microsoft-365/copilot/pricing)). We win regulated mid-market teams needing **provable cites + graph risk flags** without **$200K+ ACV** ([Vendr Harvey band](https://www.vendr.com/marketplace/harvey)).

---

## 1. Matrix

| Criterion | **DocMind OS** | **Harvey AI** | **Glean** | **Ironclad** | **MS Copilot (Legal)** |
|---|---|---|---|---|---|
| **1. Temporal Logic** | **⚠️ Partial** — `valid_from`/`valid_to` + `as_of` Cypher in `graph_schema.py`; **not** in `/api/v1/chat` or Time Machine UI.<br>*Source: repo* | **❓ Unknown** — no public valid/transaction-time model.<br>*Source: [harvey.ai](https://www.harvey.ai)* | **❓ Unknown** — search indexes current corpus; no as-of legal API documented.<br>*Source: [glean.com/product](https://www.glean.com/product)* | **❓ Unknown** — CLM version/state tracking public; bitemporal legal reconstruction not documented.<br>*Source: [ironcladapp.com](https://ironcladapp.com)* | **❓ Unknown** — Copilot uses current M365 context; no legal as-of datastore in docs.<br>*Source: [MS Copilot docs](https://learn.microsoft.com/microsoft-365-copilot/)* |
| **2. Provenance / Citations** | **⚠️ Partial** — RAG returns `document_id`, `chunk_index`, snippet (`rag_service.py`); **no bbox** in API schema; bbox types UI-only.<br>*Source: repo* | **⚠️ Partial** — Vault answers cite source docs/passages in demos; pixel bbox not public.<br>*Source: Harvey product demos, press | **⚠️ Partial** — doc links + snippets from connectors.<br>*Source: Glean docs | **⚠️ Partial** — clause/metadata within CLM records.<br>*Source: Ironclad AI Assist | **⚠️ Partial** — grounding cites to M365 files (passage-level).<br>*Source: [Copilot grounding](https://learn.microsoft.com/copilot/microsoft-365/copilot-overview) |
| **3. Confidence Score** | **⚠️ Partial** — `ConfidencePropagator` + `/knowledge/provenance/*`; chat returns `risk_score`, `low_confidence_facts` — **not** per-citation scores in chat API.<br>*Source: repo* | **❓ Unknown** — no public per-fact confidence docs.<br>*Source: harvey.ai | **❓ Unknown** — relevance ranking only in public materials.<br>*Source: glean.com | **❓ Unknown** — no propagation docs.<br>*Source: ironcladapp.com | **❓ Unknown** — not documented for legal claims.<br>*Source: Microsoft Learn |
| **4. Multi-tenant** | **⚠️ Partial** — RLS migrations + `org_id` in graph schema; **MVP chat scoped by `user_id`**, org product incomplete.<br>*Source: repo, ARCHITECTURAL_PASSPORT §2.1 | **⚠️ Partial** — enterprise per-firm SaaS; isolation details not public.<br>*Source: inferred | **✅ Native** — multi-tenant SaaS, org isolation, SCIM.<br>*Source: [Glean Trust](https://trust.glean.com) | **✅ Native** — multi-tenant CLM standard.<br>*Source: Ironclad security | **✅ Native** — Azure AD tenant boundary.<br>*Source: Microsoft 365 architecture |
| **5. EU AI Act Ready** | **❌ Not shipped** — GTM Enterprise pack is roadmap; no certified deployer artifact bundle live.<br>*Source: `docs/gtm/02-pricing-page.md` | **⚠️ Partial** — SOC2/security pages; no Art.13/14 legal deployer pack public.<br>*Source: Harvey trust | **⚠️ Partial** — GDPR/SOC2; generic AI governance.<br>*Source: Glean compliance | **⚠️ Partial** — SOC2/GDPR CLM vendor docs.<br>*Source: Ironclad trust | **⚠️ Partial** — [EU Data Boundary](https://learn.microsoft.com/microsoft-cloud-eu-operating-boundary), Copilot transparency notes; deployer maps own legal use. |
| **6. Pricing** | **⚠️ Partial** — public tier copy ($0/$49/$299); **no self-serve billing shipped**.<br>*Source: `docs/gtm/02-pricing-page.md` | **❌ Opaque** — custom only; Vendr **~$1,000–2,000+/seat/mo**, **$50K–500K+ ACV**.<br>*Source: [Vendr Harvey](https://www.vendr.com/marketplace/harvey) | **❌ Opaque** — sales-led; G2/Vendr **~$50–100+/user/mo** bands.<br>*Source: [G2 Glean pricing](https://www.g2.com/products/glean/pricing) | **❌ Opaque** — **~$30K–150K+/yr** platform.<br>*Source: [Vendr Ironclad](https://www.vendr.com/marketplace/ironclad) | **✅ Transparent** — Copilot **$30/user/mo** (annual, eligible SKUs).<br>*Source: [Microsoft Copilot pricing](https://www.microsoft.com/en-us/microsoft-365/copilot/pricing) |

---

## 2. Per-criterion deep-dive (≤100 words each)

**1. Temporal Logic** — Counsel needs *as-of* answers for DD and regulators. DocMind has **graph-layer** bitemporal queries shipped; **chat/UI not wired**. Competitors: no public equivalent—**❓**, not proven absent. **Diff: architectural lead, not yet product-complete.**

**2. Provenance** — Litigation needs locatable passages. DocMind ships **chunk + snippet** cites today; **bbox aspirational**. Harvey partial in demos. **Diff: roadmap bbox; today parity at chunk level.**

**3. Confidence** — Oversight needs “verify first.” DocMind ships **graph propagation + chat risk flags**; not full per-claim UI. Competitors **❓**. **Diff: knowledge API + risk_warning in RAG—partial.**

**4. Multi-tenant** — Economic SaaS requires isolation. Glean/Ironclad/Copilot **✅ proven**. DocMind **user-scoped MVP** + org RLS in DB. **Parity lag on org product.**

**5. EU AI Act** — Deployers need artifact packs. Microsoft strongest infra; all vendors **partial**. DocMind **❌ not shipped**—honest gap; sell roadmap only on Enterprise.

**6. Pricing** — Mid-market buys transparent TCO. DocMind **published** low seats; Harvey/Ironclad/Glean **opaque high ACV**. Copilot **wins** low-end productivity price.

---

## 3. Battlecards

### vs Harvey AI
**When:** "Evaluating Harvey." **Reality:** Am Law / **$50K–500K+ ACV**, custom quote ([Vendr](https://www.vendr.com/marketplace/harvey)). **Position:** Mid-market cites + graph risk without BigLaw tax. **Concession:** Harvey wins embed + scale at Am Law 100.

### vs Glean
**When:** "We have Glean." **Reality:** Horizontal search, **❓** on legal temporal/confidence. **Position:** Glean finds; DocMind reasons on legal corpus—complement. **Concession:** Glean wins connector breadth (Slack/Jira/HR).

### vs Ironclad
**When:** "Ironclad handles contracts." **Reality:** CLM workflow, not cross-corpus DD/litigation RAG. **Position:** Reasoning layer above signed contracts. **Concession:** Don't replace working CLM.

### vs MS Copilot
**When:** "Copilot included in M365." **Reality:** **$30/user/mo** drafting aid ([pricing](https://www.microsoft.com/en-us/microsoft-365/copilot/pricing)). **Position:** Timeline reconstruction + graph risk vs email drafts. **Concession:** Keep Copilot for everyday productivity.

---

## 4. Where We Lose

1. **Am Law 100 + Harvey budget** — brand, workflow embed; we lack scale proof.  
2. **Buyer needs only CLM renewals** — Ironclad is the right tool.  
3. **&lt;5 lawyers, &lt;100 docs/mo** — Copilot/Free sufficient; our ROI weak.  
4. **FedRAMP / IL5 Day 1** — we ship commercial cloud only.  
5. **Prospect requires shipped bbox + as-of chat today** — we are **Partial**; risk failed pilot.

---

## 5. Quick Reference (printable)

| | DocMind | Harvey | Glean | Ironclad | Copilot |
|---|:---:|:---:|:---:|:---:|:---:|
| As-of (shipped) | ⚠️ | ❓ | ❓ | ❓ | ❓ |
| Bbox cites (shipped) | ❌ | ❓ | ❌ | ❌ | ❌ |
| Confidence (shipped) | ⚠️ | ❓ | ❓ | ❓ | ❓ |
| Public price | ⚠️ | ❌ | ❌ | ❌ | ✅ |
| Entry $ | $49* | $1K+/seat | $50+/seat | $30K+/yr | $30/seat |

*\*GTM list price; billing not live.*

**Qualify out:** Am Law + Harvey signed · CLM-only · need shipped bbox/as-of **today** · FedRAMP Day 1.

**Discovery Q:** *"Last time you reconstructed truth on a past date—what did you do?"*

---

## 6. Update Cadence

| What | Frequency | Owner | Sources |
|------|-----------|-------|---------|
| **Harvey + CoCounsel pricing** | Monthly | GTM / CI | [Vendr Harvey](https://www.vendr.com/marketplace/harvey), [Vendr CoCounsel](https://www.vendr.com/marketplace/cocounsel), G2, press |
| **EU AI Act posture (all vendors)** | Quarterly | Legal + CI | Vendor trust centers, EU Commission guidance, Microsoft/EU Data Boundary updates |
| **New entrants** | Each quarter | CI | Spellbook, Iqidis, Lexis+ Protégé, etc.—add row or battlecard when **public** pricing + feature docs exist |
| **DocMind shipped status** | Each release | Product | Re-audit repo before changing ✅/⚠️/❌ |

---

*Competitive Intel · DocMind OS · v1.1*
