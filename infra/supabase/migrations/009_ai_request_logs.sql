-- Doc-Hub — ai_request_logs per-user OpenAI cost tracking
-- Upgrades stub from 002_document_chunks.sql (request_type, prompt_tokens, …)
-- Canonical path: infra/supabase/migrations/

CREATE TABLE IF NOT EXISTS public.ai_request_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid,
    org_id              uuid,
    operation           text NOT NULL DEFAULT 'unknown',
    model               text NOT NULL DEFAULT 'unknown',
    prompt_tokens       int NOT NULL DEFAULT 0,
    completion_tokens   int NOT NULL DEFAULT 0,
    total_tokens        int NOT NULL DEFAULT 0,
    cost_usd            numeric(12, 8) NOT NULL DEFAULT 0,
    latency_ms          int,
    status              text NOT NULL DEFAULT 'ok',
    error               text,
    trace_id            text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Upgrade legacy columns (002 stub + prior 009 input_tokens names) ─────────
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS operation text NOT NULL DEFAULT 'unknown';
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS prompt_tokens int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS completion_tokens int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS total_tokens int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ok';
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS error text;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS trace_id text;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS input_tokens int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS output_tokens int NOT NULL DEFAULT 0;
ALTER TABLE public.ai_request_logs ADD COLUMN IF NOT EXISTS request_id text;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'ai_request_logs'
          AND column_name = 'request_type'
    ) THEN
        UPDATE public.ai_request_logs
        SET operation = COALESCE(NULLIF(operation, 'unknown'), request_type)
        WHERE request_type IS NOT NULL;
    END IF;

    UPDATE public.ai_request_logs
    SET
        prompt_tokens = CASE
            WHEN prompt_tokens > 0 THEN prompt_tokens
            WHEN input_tokens > 0 THEN input_tokens
            ELSE COALESCE(prompt_tokens, 0)
        END,
        completion_tokens = CASE
            WHEN completion_tokens > 0 THEN completion_tokens
            WHEN output_tokens > 0 THEN output_tokens
            ELSE COALESCE(completion_tokens, 0)
        END,
        total_tokens = CASE
            WHEN total_tokens > 0 THEN total_tokens
            ELSE COALESCE(prompt_tokens, 0) + COALESCE(completion_tokens, 0)
        END,
        trace_id = COALESCE(trace_id, request_id),
        error = COALESCE(
            error,
            CASE WHEN status = 'error' THEN 'request failed' ELSE NULL END
        )
    WHERE input_tokens > 0
       OR output_tokens > 0
       OR request_id IS NOT NULL
       OR status = 'error';
END $$;

-- ── Indexes for dashboard queries ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ai_logs_user_created
    ON public.ai_request_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_logs_model_created
    ON public.ai_request_logs (model, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_logs_operation
    ON public.ai_request_logs (operation, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.ai_request_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_logs_select_own" ON public.ai_request_logs;
CREATE POLICY "ai_logs_select_own"
    ON public.ai_request_logs FOR SELECT
    USING (auth.uid() = user_id);

-- ── Dashboard view ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.ai_cost_summary AS
SELECT
    user_id,
    model,
    operation,
    DATE_TRUNC('day', created_at) AS day,
    COUNT(*) AS request_count,
    SUM(total_tokens) AS total_tokens,
    SUM(cost_usd) AS total_cost_usd,
    AVG(latency_ms) AS avg_latency_ms
FROM public.ai_request_logs
GROUP BY user_id, model, operation, DATE_TRUNC('day', created_at);

COMMENT ON TABLE public.ai_request_logs IS
    'Per-call OpenAI usage log: tokens, cost, latency. Per-user cost attribution.';

COMMENT ON VIEW public.ai_cost_summary IS
    'Daily aggregated OpenAI cost metrics by user, model, and operation.';
