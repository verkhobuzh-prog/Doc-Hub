# Класифікація Risk Analysis Agent за EU AI Act

**Status:** Draft v0.1  
**Last updated:** 2026-06-06

---

## 1. Предмет аналізу

**Система:** Risk Analysis Agent у Doc-Hub — backend-компонент, що:

- обчислює **entity risk scoring** (оцінка ризику сутностей) через `ConfidencePropagator` та semantic triples;
- виконує **contradiction analysis** (аналіз суперечностей) через `GraphReasoningAgent`;
- формує **explainability chain** (ланцюг пояснюваності) з evidence path через Provenance Layer (`semantic_triples`, `ProvenanceRecord`);
- повертає **risk score 0–100** з `explanation`, `risk_level`, кількістю low-confidence/disputed triples.

**API:** `POST /api/v1/knowledge/risk-analysis`, `POST /api/v1/reasoning/analyze/{doc_id}`, `POST /api/v1/reasoning/compare`.

**Intended purpose (цільове призначення):** інфраструктурний аналіз корпоративних документів для downstream B2B-платформ; Doc-Hub **не** приймає судові рішення і **не** замінює професійний legal advice (юридичну консультацію).

---

## 2. Покроковий тест: Article 6 + Annex III

Згідно з **Article 6(1)**, AI system є **high-risk**, якщо відповідає критеріям **Article 6(1)(a)**–**(c)** (Annex I products / safety components) **або** **Article 6(2)** (системи з **Annex III**).

### 2.1 Article 6(1)(a)–(c) — Annex I / safety component

| Крок | Питання | Вердикт |
|------|---------|---------|
| 6(1)(a) | Чи є Doc-Hub product з Annex I? | **НІ** — програмна SaaS-платформа, не product з Annex I |
| 6(1)(b) | Чи є safety component (компонент безпеки) product з Annex I? | **НІ** |
| 6(1)(c) | Чи потребує product з Annex I conformity assessment з AI? | **НІ** |

**Проміжний висновок:** шлях Annex I **не застосовується**.

### 2.2 Article 6(2) — Annex III (8 категорій)

**Article 6(2):** AI system з **Annex III** є high-risk, якщо відповідає пунктам Annex III та умовам **Article 6(3)** (значний ризик для health, safety або fundamental rights).

| # | Категорія Annex III | Застосовність до Doc-Hub Risk Agent | Вердикт |
|---|---------------------|-------------------------------------|---------|
| 1 | Biometric identification and categorisation (біометрична ідентифікація) | Agent не ідентифікує осіб за біометрією | **НЕ HIGH-RISK** |
| 2 | Critical infrastructure (критична інфраструктура) | Не керує енергетикою, водою, транспортом тощо | **НЕ HIGH-RISK** |
| 3 | Education and vocational training (освіта) | Не оцінює учнів, не визначає доступ до освіти | **НЕ HIGH-RISK** |
| 4 | Employment, workers management (зайнятість) | Типовий контрактний аналіз ≠ hiring/firing decisions; downstream misuse — див. §4 | **НЕ HIGH-RISK** *(platform default)* |
| 5 | Essential private/public services and benefits (соціальні послуги) | Не визначає credit scoring, insurance pricing, social benefits | **НЕ HIGH-RISK** |
| 6 | Law enforcement (правоохоронна діяльність) | Doc-Hub не є law enforcement authority | **НЕ HIGH-RISK** |
| 7 | Migration, asylum and border control (міграція) | Не застосовується | **НЕ HIGH-RISK** |
| 8 | Administration of justice and democratic processes (правосуддя) | Детально — §3 | **НЕ HIGH-RISK** *(platform default)* |

**Проміжний висновок:** жодна категорія Annex III **не покриває** типове B2B contract intelligence use case Doc-Hub як **provider**.

### 2.3 Article 6(3) — significant risk override

**Article 6(3):** система з Annex III може **не** бути high-risk, якщо не створює significant risk. Навіть якщо downstream deployer спробує натягнути категорію 4 або 8, Doc-Hub як **provider** має:

- чіткий **Acceptable Use Policy (AUP)** з забороною high-risk verticals;
- contractual **intended purpose** limitation;
- technical separation (API keys, scope flags).

[TBD: уточнити в Legal Lead — чи потрібна formal notification за Article 6(3) процедурою для конкретного downstream.]

---

## 3. Детально: Annex III, пункт 8 — administration of justice / ADR

**Annex III, point 8** охоплює AI systems, що використовуються для **administration of justice** (адміністрування правосуддя) та **alternative dispute resolution (ADR)** (альтернативне вирішення спорів), у т.ч. системи, що **впливають на outcome** судового або ADR-процесу.

### 3.1 Чому B2B contract analysis Doc-Hub **не** потрапляє під пункт 8

**Аргумент 1 — відсутність judicial function (судової функції):**  
Risk Analysis Agent аналізує **приватні корпоративні документи** користувача в DataRoom; він **не** подає документи до суду, **не** формує судове рішення і **не** інтегрований із case management system суду. За **Article 3(1)** AI system має operate with **autonomy** у заданому purpose — purpose Doc-Hub = document intelligence infrastructure, не **administration of justice** за змістом Annex III point 8.

**Аргумент 2 — infrastructure provider vs decision-maker:**  
Doc-Hub — **AI Infrastructure Provider**; downstream-платформа сама визначає UX і чи показувати score юристу чи кінцевому клієнту. Provider **не** автоматизує judicial outcome; це відповідає логіці recital щодо ролей у value chain [TBD: уточнити в Legal Lead — конкретний recital номер після legal review].

**Аргумент 3 — B2B contract review ≠ ADR proceeding:**  
Контрактний due diligence (перевірка контракту) у корпоративному DataRoom — це **підготовчий аналітичний крок**, а не mediation/arbitration platform (платформа ADR). Agent не призначає arbitrator, не фіксує settlement і не блокує доступ до justice.

**Аргумент 4 — human remains decision-maker:**  
Article 14 вимагає human oversight для high-risk; Doc-Hub **проектує** evidence path + reasoning chain саме для того, щоб **людина-експерт** downstream приймала рішення. Це підкреслює ancillary (допоміжний), а не determinative (визначальний) характер output.

---

## 4. Сценарії зміни класифікації на HIGH-RISK

Класифікація змінюється, якщо **downstream deployer** або **Doc-Hub vertical** використовує Agent для:

| Заборонений / high-risk downstream use case | Annex III trigger | Дія Doc-Hub |
|---------------------------------------------|-------------------|-------------|
| Автоматичне **відмовлення в кредиті/страхуванні** на basis Agent score | Point 5 | **AUP ban** + contract termination |
| **Hiring / firing** recommendation без human gate | Point 4 | **AUP ban** |
| **Судовий case outcome prediction** з presentation як binding | Point 8 | **AUP ban** |
| **Migration/asylum** decision support | Point 7 | **AUP ban** |
| Doc-Hub запускає **власний** legal advice product «як заміна адвоката» | Point 8 [TBD: legal review] | **Product gate** + conformity assessment |

> Усі вищезазначені use cases мають бути явно **заборонені** в Acceptable Use Policy та DPA.

---

## 5. Фінальний вердикт

| Параметр | Значення |
|----------|----------|
| **Класифікація (platform default)** | **Limited Risk** — не high-risk AI system за Article 6 + Annex III |
| **Базовий правовий режим** | **Article 50** — transparency obligations (обов'язки прозорості) |
| **High-risk readiness** | Добровільний Annex IV toolkit для downstream deployers (див. [02-annex-iv-technical-documentation.md](./02-annex-iv-technical-documentation.md)) |

---

## 6. Article 50 — transparency obligations для Doc-Hub

**Article 50(1)** — AI systems intended to interact directly with natural persons (natural persons) мають бути designed so that those persons are **informed** that they interact with AI.

### 6.1 Застосовність до Doc-Hub

- **RAG Chat** та **Risk Analysis UI** (через downstream) — interaction with natural persons **можливий**.
- Doc-Hub API має забезпечити deployer можливість compliance.

### 6.2 Конкретні obligations

| Article 50 | Obligation | Doc-Hub implementation |
|------------|------------|------------------------|
| **Article 50(1)** | Inform user about AI interaction | Metadata field `ai_disclosure_required: true` у chat/risk responses; UI guideline для downstream |
| **Article 50(2)** *(where applicable)* | Mark AI-generated content | Response header `X-AI-Generated: true`; markdown badge «AI-generated» у ChatPage |
| **Article 50(4)** *(deep fake — if applicable)* | Disclosure for synthetic content | **N/A** за default — Doc-Hub не генерує synthetic audio/video [TBD якщо roadmap зміниться] |

### 6.3 Технічна реалізація (короткий список)

1. Chat streaming `done` event — поле `model` + `ai_generated: true` [TBD: додати в schema].
2. Risk API response — поле `disclaimer: "AI-generated analysis; requires human review"`.
3. Frontend ChatPage — persistent banner «Ви взаємодієте з AI».
4. OpenAPI description tags для `/chat`, `/risk-analysis`, `/reasoning/*`.
5. Developer docs: downstream MUST display Article 50(1) notice.

---

## 7. GPAI considerations (foundation models)

Doc-Hub використовує **GPAI models** (general-purpose AI models) через API (OpenAI) для embeddings та chat completion.

| Роль Doc-Hub | Стаття | Implication |
|--------------|--------|-------------|
| **GPAI deployer / downstream deployer** | **Article 53**, **Article 56** | Doc-Hub зобов'язаний дотримуватись obligations для deployers: transparency, документація provider, copyright policy [TBD: повний checklist] |
| **GPAI provider** | **Article 51**, **Article 52** | Doc-Hub **не є** provider — OpenAI et al. |
| **Systemic risk GPAI** | **Article 55** | [TBD: чи використовуємо models з systemic risk designation] |

**Практичні кроки:**

1. Зберігати **model card** / provider terms для кожної моделі в Annex IV §2.
2. **Article 53(1)(c)** — document training data summary від provider (не власне навчання).
3. Не fine-tune на personal data без GDPR legal basis (Task 2).

---

## 8. Джерела

- Regulation (EU) 2024/1689 — **Article 3**, **Article 6**, **Article 50**, **Annex III**
- European Commission draft guidelines on AI Act (травень 2026) — [TBD: офіційне посилання після публікації в OJ]
- Doc-Hub architecture: [ARCHITECTURAL_PASSPORT.md](../../ARCHITECTURAL_PASSPORT.md), `backend/app/knowledge/confidence.py`, `backend/app/api/v1/endpoints/knowledge.py`

---

[← Повернутися до індексу](./README.md)
