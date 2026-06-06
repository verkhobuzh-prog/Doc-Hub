/** RFC 4122 UUID string identifier. */
export type UUID = string

/** ISO 8601 date-time string (e.g. `2024-03-15T10:00:00Z`). */
export type ISODateTime = string

/**
 * Normalized bounding box on a PDF page (coordinates in the 0..1 range).
 * Used for inline highlight overlays in the citation viewer.
 */
export interface BoundingBox {
  /** 1-indexed page number within the document. */
  page: number
  /** Left edge, normalized 0..1. */
  x0: number
  /** Top edge, normalized 0..1. */
  y0: number
  /** Right edge, normalized 0..1. */
  x1: number
  /** Bottom edge, normalized 0..1. */
  y1: number
}

/**
 * Provenance path linking an assistant claim to a source chunk in the DataRoom.
 */
export interface EvidencePath {
  /** Source document identifier. */
  doc_id: UUID
  /** Chunk identifier within the document index. */
  chunk_id: UUID
  /** 1-indexed page where the evidence appears. */
  page: number
  /** Layout bbox for PDF highlight; null for plain-text sources without layout. */
  bbox: BoundingBox | null
  /** Optional legal section reference (e.g. `"§3.2"`). */
  section?: string
}

/**
 * Citation surfaced in the chat UI as an interactive chip with hover preview.
 */
export interface Citation {
  /** Unique citation id within the parent assistant message. */
  id: UUID
  /** Human-readable filename shown in the chip (e.g. `"NDA_2023.pdf"`). */
  doc_name: string
  /** Source document identifier. */
  doc_id: UUID
  /** 1-indexed page number for display. */
  page: number
  /** Optional section label (e.g. `"§3"`). */
  section?: string
  /** Short excerpt for tooltip preview (typically 200–300 characters). */
  snippet: string
  /** Full evidence path including bbox for the document viewer. */
  evidence: EvidencePath
  /** Reranker relevance score in the 0..1 range. */
  relevance_score: number
}

/** Role of a message in a conversation thread. */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * A single message in a chat conversation, including optional citations
 * and model metadata for assistant responses.
 */
export interface ChatMessage {
  id: UUID
  conversation_id: UUID
  role: MessageRole
  content: string
  /** Empty for user and system messages. */
  citations: Citation[]
  /** Aggregate confidence for assistant answers; null for user messages. */
  confidence_score: number | null
  created_at: ISODateTime
  tokens_used?: number
  /** Model identifier used to generate the response (e.g. `"gpt-4o-mini"`). */
  model?: string
}

/** Request body for `POST /api/v1/chat`. */
export interface ChatRequest {
  /** Existing conversation id; omit to start a new thread. */
  conversation_id?: UUID
  query: string
  /** Restrict retrieval to specific documents in the DataRoom. */
  context_doc_ids?: UUID[]
  /** Point-in-time filter for Time Machine queries. */
  as_of_date?: ISODateTime
}

/** Response body for `POST /api/v1/chat` (non-streaming). */
export interface ChatResponse {
  message: ChatMessage
  conversation_id: UUID
}

/** Retrieved chunk emitted at stream start (`rag_service.query_stream` `sources` event). */
export interface StreamSource {
  document_id: UUID
  chunk_index: number
  chunk_id?: UUID | null
  snippet: string
  score: number
  filename?: string | null
  vector_score?: number | null
  fts_score?: number | null
}

/** Citation payload inside backend `done` event (chunk-level, not full UI `Citation`). */
export interface StreamCitationPayload {
  document_id: UUID
  chunk_index: number
  snippet: string
  label?: string | null
}

/**
 * Server-sent events from `POST /api/v1/chat` with `stream: true`.
 * Matches `backend/app/services/rag_service.py` `query_stream` yields.
 */
export type ChatStreamEvent =
  | { type: 'sources'; sources: StreamSource[] }
  | { type: 'token'; content: string }
  | { type: 'citation'; citation: Citation }
  | { type: 'confidence'; score: number }
  | {
      type: 'done'
      answer: string
      citations: StreamCitationPayload[]
      model: string
      risk_score?: number
      risk_level?: string
      risk_warning?: string | null
      low_confidence_facts?: number
      disputed_facts?: number
      total_facts_analyzed?: number
    }
  | { type: 'error'; error: string }
