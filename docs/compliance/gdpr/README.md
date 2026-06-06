# Doc-Hub — GDPR Compliance Hub

**Status:** Draft v0.1  
**Last updated:** 2026-06-06  
**Document owner:** Legal Lead / DPO *(placeholder)*

---

## Executive summary

Doc-Hub діє як **processor** (обробник даних) за **Article 28** GDPR: downstream B2B-платформи (legaltech, compliance, M&A) є **controllers** (контролерами), а Doc-Hub обробляє персональні дані **лише за документованими інструкціями** controller через DPA (Data Processing Agreement). Основні **sub-processors** (субобробники): **OpenAI** (LLM + embeddings, US — SCCs), **Supabase** (Postgres, Storage, Auth — EU), **FalkorDB** (knowledge graph — EU), **Render** (hosting — region-dependent), **Redis** (cache — [TBD]). Цей hub покриває **Articles 6, 9, 17, 22, 28–32, 35, 44–49** та cross-links до EU AI Act transparency/human oversight.

**Data subject requests (запити суб'єктів даних):** [TBD: privacy@dochub.example — placeholder]

---

## AI Act ↔ GDPR overlap

| Тема | EU AI Act | GDPR | Overlap / пріоритет |
|------|-----------|------|---------------------|
| Risk Analysis Agent output | Limited Risk — **Article 50** transparency | **Article 22** automated decision-making; **Article 35** DPIA | AI Act disclosure + GDPR human-in-the-loop; DPIA обов'язковий при profiling — див. [04-dpia-risk-analysis-agent.md](./04-dpia-risk-analysis-agent.md) |
| Evidence / audit trail | **Article 14** human oversight spec | **Article 30** RoPA; **Article 32** security; **Article 17** erasure vs retention | Audit logs vs erasure — tombstone pattern у [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md); oversight — [../ai-act/03-human-oversight-mechanism.md](../ai-act/03-human-oversight-mechanism.md) |
| Embeddings / pgvector | GPAI deployer duties (**Article 53**) | **Personal data** (EDPB Opinion 28/2024); **Article 17** cascade delete | GDPR drives hard delete embeddings; AI Act drives model documentation — див. [01-data-flow-mapping.md](./01-data-flow-mapping.md) |

**Classification baseline (AI Act):** [../ai-act/01-classification-analysis.md](../ai-act/01-classification-analysis.md)

---

## Документи в цій папці

| Файл | Опис |
|------|------|
| [01-data-flow-mapping.md](./01-data-flow-mapping.md) | Inventory персональних даних, Mermaid data flow, legal bases, transfers, subprocessors |
| [02-records-of-processing-activities.md](./02-records-of-processing-activities.md) | **Article 30(2)** processor RoPA — template, заповнений де відомо |
| [03-dpa-template.md](./03-dpa-template.md) | **Article 28** DPA — Doc-Hub Processor, downstream Controller |
| [04-dpia-risk-analysis-agent.md](./04-dpia-risk-analysis-agent.md) | **Article 35** DPIA для Risk Analysis Agent + **Article 22** analysis |
| [05-right-to-erasure-procedure.md](./05-right-to-erasure-procedure.md) | **Article 17** erasure — cascade delete, bitemporal tombstone, API design |

---

## Governance

| Роль | Відповідальність |
|------|------------------|
| **DPO** | DPIA, RoPA, DSAR coordination |
| **Legal Lead** | DPA, transfers, AUP |
| **Tech Lead** | Article 17 implementation, RLS, encryption |

---

← Back to [README](./README.md)
