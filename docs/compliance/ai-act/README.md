# Doc-Hub — EU AI Act Compliance Hub

**Status:** Draft v0.1  
**Last updated:** 2026-06-06  
**Document owner:** Legal Lead *(placeholder)*

---

## Executive summary

Doc-Hub позиціонується як **AI Infrastructure Provider** (постачальник AI-інфраструктури): платформа надає downstream-клієнтам API для семантичного аналізу документів, RAG-чату та **Risk Analysis Agent** (агент аналізу ризиків) з explainability chain і evidence path. За поточною оцінкою (див. [01-classification-analysis.md](./01-classification-analysis.md)) Risk Analysis Agent у типовому B2B-сценарії **не класифікується як high-risk AI system** за Article 6 та Annex III, але підпадає під **transparency obligations** (обов'язки прозорості) Article 50 як **Limited Risk** система. Doc-Hub добровільно готує Annex IV technical documentation (технічну документацію) як **AI Act Readiness Toolkit** для deployers, які можуть використовувати платформу у high-risk verticals.

---

## Compliance deadlines

| Подія | Дата | Примітка |
|-------|------|----------|
| **Загальне застосування AI Act** | 2 серпня 2026 | Основний deadline для більшості обов'язків щодо high-risk AI systems (Article 113(2)) |
| **GPAI obligations** | 2 серпня 2025 *(already in force for providers)* | Doc-Hub як deployer GPAI — див. §6 у [01-classification-analysis.md](./01-classification-analysis.md) |
| **Digital Omnibus (draft, травень 2026)** | [TBD: уточнити в Legal Lead] | Європейська Комісія обговорює перенесення/спрощення окремих high-risk вимог; моніторити офіційні OJ публікації |

> **Disclaimer:** Цей hub — внутрішній working draft, не юридична консультація. Фінальні висновки затверджує Legal Lead.

---

## Документи в цій папці

| Файл | Опис |
|------|------|
| [01-classification-analysis.md](./01-classification-analysis.md) | Юридичний аналіз класифікації Risk Analysis Agent за Article 6, Annex III та Article 50 |
| [02-annex-iv-technical-documentation.md](./02-annex-iv-technical-documentation.md) | Шаблон Annex IV technical documentation для downstream high-risk deployers |
| [03-human-oversight-mechanism.md](./03-human-oversight-mechanism.md) | Специфікація human oversight (Article 14) з мапінгом на API та audit trail Doc-Hub |
| [04-conformity-assessment-checklist.md](./04-conformity-assessment-checklist.md) | Checklist conformity assessment (Articles 9–17) з effort estimates |

---

## Scope

- **In scope:** Risk Analysis Agent (`GraphReasoningAgent`, `ConfidencePropagator`, `/api/v1/knowledge/risk-analysis`, `/api/v1/reasoning/*`), Provenance Layer, RAG risk warnings.
- **Out of scope (цей hub):** GDPR DPIA, sector-specific regulation (MiFID II, medical devices) — окремі workstreams.

---

## Контакти та governance

| Роль | Відповідальність |
|------|------------------|
| **Legal Lead** | Класифікація, AUP, conformity strategy |
| **Tech Lead** | Annex IV, human oversight implementation |
| **DPO** | GDPR alignment (Task 2) |

---

[← Повернутися до індексу](./README.md)
