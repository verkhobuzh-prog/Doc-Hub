# Security Fixes — Manual Application Guide

**Last updated:** 2026-06-06

Цей документ описує кроки для **ручного** застосування критичних security-міграцій у Supabase.  
Автоматичний `supabase db push` у CI **не** виконується для цих змін — оператор підтверджує кожен крок.

---

## RLS Hardening — `004_rls_policies.sql`

### Що виправляє

| Ризик | Mitigation |
|-------|------------|
| IDOR через забутий `.eq("user_id", …)` у backend | RLS на `documents` і `document_chunks` |
| Client підставляє чужий `user_id` при INSERT | `WITH CHECK (auth.uid() = user_id)` |
| Перепризначення документа через UPDATE | `WITH CHECK` на UPDATE |

**Defense in depth:**

1. **DB (RLS)** — ця міграція  
2. **App** — `.eq("user_id", uid)` у сервісах (залишається)  
3. **JWT** — `get_current_user` middleware  

**Backend `service_role`** продовжує обходити RLS — це очікувана поведінка Supabase для ingestion/workers.  
Файл `app/db/supabase.py` **не змінювати**.

### Файл у репозиторії

```
supabase/migrations/004_rls_policies.sql
```

Дублікат (той самий SQL) також у:

```
infra/supabase/migrations/005_rls_hardening.sql
```

Застосуйте **один** з них — не обидва на чистій БД без потреби (міграція ідемпотентна, але дублювання зайве).

---

### Передумови

- [ ] Міграції `001_documents.sql` і `002_document_chunks.sql` уже застосовані  
- [ ] Таблиці `public.documents`, `public.document_chunks` існують  
- [ ] Supabase project має schema `auth` (Cloud — завжди так)  
- [ ] Є доступ **Owner / postgres** або service role у SQL Editor  

---

### Кроки — Supabase Dashboard (SQL Editor)

1. Відкрийте [Supabase Dashboard](https://supabase.com/dashboard) → ваш проект Doc-Hub.

2. Перейдіть **SQL Editor** → **New query**.

3. Відкрийте локально `supabase/migrations/004_rls_policies.sql` і **скопіюйте весь вміст** у редактор (Ctrl+A → Ctrl+C).

4. Натисніть **Run** (або Ctrl+Enter).

5. Очікуваний результат: `Success. No rows returned` (DDL без помилок).

6. Перевірка policies:

```sql
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('documents', 'document_chunks')
ORDER BY tablename, policyname;
```

Очікується мінімум:

| tablename | policyname | cmd |
|-----------|------------|-----|
| documents | documents_select_own | SELECT |
| documents | documents_insert_own | INSERT |
| documents | documents_update_own | UPDATE |
| documents | documents_delete_own | DELETE |
| document_chunks | chunks_select_own | SELECT |
| document_chunks | chunks_insert_own | INSERT |
| document_chunks | chunks_update_own | UPDATE |
| document_chunks | chunks_delete_own | DELETE |

7. Перевірка RLS увімкнено:

```sql
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('documents', 'document_chunks');
```

Обидва рядки: `relrowsecurity = true`.

---

### Smoke test (anon / authenticated client)

> RLS перевіряється лише з **anon key + user JWT**, не з service_role.

1. У Dashboard → **Authentication** → створіть test user або використайте існуючого.

2. Отримайте JWT test user (Login через frontend або `signInWithPassword`).

3. З **anon key** + JWT виконайте SELECT на чужі документи — має повернути **0 rows**.

4. Backend з `service_role` як і раніше бачить усі рядки (для ingestion) — це OK.

---

### Rollback (лише якщо критична помилка)

```sql
-- Видалити policies (не вимикає RLS)
DROP POLICY IF EXISTS "documents_select_own" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_own" ON public.documents;
DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
DROP POLICY IF EXISTS "chunks_select_own" ON public.document_chunks;
DROP POLICY IF EXISTS "chunks_insert_own" ON public.document_chunks;
DROP POLICY IF EXISTS "chunks_update_own" ON public.document_chunks;
DROP POLICY IF EXISTS "chunks_delete_own" ON public.document_chunks;

-- Опційно: повернути legacy policy з 002 (лише SELECT)
CREATE POLICY "chunks_select_via_document"
    ON public.document_chunks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = document_chunks.document_id
          AND d.user_id = auth.uid()
          AND d.deleted_at IS NULL
    ));
```

Після rollback — повідомте Tech Lead; app-layer `.eq("user_id")` залишається обов'язковим.

---

### Чого НЕ робити

- ❌ Не видаляти `.eq("user_id", …)` з Python сервісів  
- ❌ Не міняти `supabase.py` на anon key для backend  
- ❌ Не виконувати цей SQL автоматично з CI без review  
- ❌ Не застосовувати на production без staging smoke test  

---

## Related files

| File | Purpose |
|------|---------|
| `supabase/migrations/004_rls_policies.sql` | RLS policies (manual apply) |
| `infra/supabase/migrations/005_rls_hardening.sql` | Same SQL in infra migration chain |
| `backend/app/db/supabase.py` | service_role client (unchanged) |
