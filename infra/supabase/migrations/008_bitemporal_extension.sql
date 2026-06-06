-- Doc-Hub — Bitemporal extension (valid_time MVP)
-- Apply MANUALLY via Supabase SQL Editor (do not auto-push).
-- MVP: valid_from / valid_to only. transaction_time proxied by created_at when NULL.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS supersedes_doc_id UUID NULL REFERENCES public.documents(id);

CREATE INDEX IF NOT EXISTS idx_documents_valid_range
  ON public.documents (user_id, valid_from, valid_to)
  WHERE status = 'indexed' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_supersedes
  ON public.documents (supersedes_doc_id)
  WHERE supersedes_doc_id IS NOT NULL;

COMMENT ON COLUMN public.documents.valid_from IS
  'Valid-time start: when fact was true in the real world. NULL = effective since upload (created_at proxy).';
COMMENT ON COLUMN public.documents.valid_to IS
  'Valid-time end (exclusive). NULL = still valid. Set when superseded or expired.';
COMMENT ON COLUMN public.documents.supersedes_doc_id IS
  'Prior document version this row replaces (amendment chain).';

-- Documents effective (valid) as of a point in time.
CREATE OR REPLACE FUNCTION public.documents_valid_at(user_id_param UUID, as_of TIMESTAMPTZ)
RETURNS SETOF public.documents
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.documents
  WHERE user_id = user_id_param
    AND status = 'indexed'
    AND deleted_at IS NULL
    AND (valid_from IS NULL OR valid_from <= as_of)
    AND (valid_to IS NULL OR valid_to > as_of);
$$;

COMMENT ON FUNCTION public.documents_valid_at IS
  'Returns indexed documents valid (effective) at as_of using valid_time only (MVP).';
