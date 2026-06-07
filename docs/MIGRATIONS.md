# Doc-Hub — Migration Registry

**Last updated:** 2026-06-07  
**Canonical directory (Docker + local Postgres):** `infra/supabase/migrations/`  
**Manual Supabase Cloud apply:** `supabase/migrations/` (окремий трек, не монтується в Docker)

---

## Audit C4 — duplicate prefix `003_*` (resolved)

### Проблема

У Docker Postgres міграції застосовуються з `/docker-entrypoint-initdb.d/*.sql` у **алфавітному** порядку імен файлів. Два файли з однаковим числовим префіксом (`003_…`) давали **недетермінований** порядок і ризик зламаних FK.

| Було (конфлікт) | Проблема |
|-----------------|----------|
| `003_knowledge_graph_metadata.sql` | Коректний контент, префікс **залишено** (застосовано на Supabase Cloud) |
| `003_profiles.sql` | **Неправильний префікс** — дублікат `003` з metadata |
| `003_knowledge_graph.sql` | Застарілий дублікат metadata (видалено) |

### Виправлення (2026-05-25, `scripts/migration_rename.py`)

| Старе ім'я | Нове ім'я | Чому |
|------------|-----------|------|
| `003_profiles.sql` | `004_profiles.sql` | Profiles не залежить від triples; має йти після 003 |
| `004_rls_hardening.sql` | `005_rls_hardening.sql` | Зсув через новий 004 |
| `005_pilot_invites_and_catalog.sql` | `006_pilot_invites_and_catalog.sql` | Зсув |
| `006_document_state_machine.sql` | `007_document_state_machine.sql` | Зсув |

**Не перейменовувалось (вже на Cloud):** `003_knowledge_graph_metadata.sql`

Backup до rename: `infra/supabase/migrations_backup_20260525_053245/`

---

## Залежності між міграціями

```
001_documents
    └── 002_document_chunks (FK documents, ai_request_logs baseline)
            └── 003_knowledge_graph_metadata (FK documents, document_chunks)
                    └── 004_profiles (subjects, user_profiles — незалежно від triples)
                            └── 005_rls_hardening (RLS documents, chunks, triples)
                                    └── 006_pilot_invites_and_catalog
                                            └── 007_document_state_machine
                                                    └── [008 reserved]
                                                            └── 009_ai_request_logs (upgrades ai_request_logs from 002)
```

---

## Реєстр міграцій — `infra/supabase/migrations/`

| № | Файл | Опис | Статус |
|---|------|------|--------|
| 001 | `001_documents.sql` | Таблиця `documents`, базовий RLS | **applied** (Cloud + Docker) |
| 002 | `002_document_chunks.sql` | `document_chunks`, pgvector, `ai_request_logs` (legacy shape) | **applied** |
| 003 | `003_knowledge_graph_metadata.sql` | `semantic_triples` + RLS via document | **applied** |
| 004 | `004_profiles.sql` | `subjects`, `user_profiles` | **applied** |
| 005 | `005_rls_hardening.sql` | IDOR hardening RLS (documents, chunks) | **applied** |
| 006 | `006_pilot_invites_and_catalog.sql` | `invite_codes`, `pilot_members`, catalog fields | **applied** |
| 007 | `007_document_state_machine.sql` | `document_events`, retry columns | **applied** |
| 008 | *(reserved)* | Bitemporal / Time Machine (`008_bitemporal_extension.sql` — WIP, ще не в repo) | **pending** |
| 009 | `009_ai_request_logs.sql` | SRE cost tracking: upgrade `ai_request_logs`, `ai_cost_summary` view | **pending** |

> **Gap 008:** навмисно зарезервовано під bitemporal. Номери не обов'язково суцільні — головне унікальність префіксів.

---

## Окремий трек — `supabase/migrations/` (manual Cloud)

| № | Файл | Опис | Статус |
|---|------|------|--------|
| 004 | `004_rls_policies.sql` | Той самий SQL що `005_rls_hardening.sql` — для ручного застосування в SQL Editor | **manual** |

**Не перейменовувати** якщо вже застосовано на Supabase Cloud під цим ім'ям.  
Деталі: [SECURITY_FIXES.md](./SECURITY_FIXES.md)

---

## Не канонічні шляхи

| Шлях | Призначення |
|------|-------------|
| `backend/app/migrations/008_ai_request_logs.sql` | **REFERENCE ONLY** — вказує на `infra/.../009_ai_request_logs.sql`. Не виконується Docker/Supabase CLI |
| `backend/migrations/` | Не використовується |

---

## Docker

`docker-compose.yml` монтує **директорію**, не окремі файли:

```yaml
- ./infra/supabase/migrations:/docker-entrypoint-initdb.d:ro
```

Hardcoded шляхів до окремих `.sql` немає — зміни імен файлів не потребують правок compose.

---

## CI / локальна перевірка

```bash
# Аудит дублікатів префіксів
python scripts/migration_rename.py check

# Валідація manifest + порядку
python scripts/migration_rename.py ci

# Застосувати історичні renames (лише якщо старі файли ще існують)
python scripts/migration_rename.py rename --yes
```

Manifest: `infra/supabase/migrations/MIGRATION_MANIFEST.txt`  
Формат: `prefix|filename|sha256_prefix`

---

## Додавання нової міграції

1. Взяти наступний вільний номер (зараз **010** після merge 009).
2. Ім'я: `NNN_snake_case_description.sql`
3. Перевірити: `python scripts/migration_rename.py ci`
4. Оновити цей документ і `MIGRATION_MANIFEST.txt` (або `rename` з `--no-backup` після ручного додавання — manifest оновиться автоматично).
