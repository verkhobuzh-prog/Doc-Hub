import type { Citation, StreamCitationPayload, StreamSource } from '@/types/chat'

/** Map backend stream citation + optional sources to UI `Citation` for `CitationChip`. */
export function mapStreamCitationToUi(
  payload: StreamCitationPayload,
  sources: StreamSource[],
  index: number,
): Citation {
  const match = sources.find(
    (s) => s.document_id === payload.document_id && s.chunk_index === payload.chunk_index,
  )
  const docId = payload.document_id
  const chunkId = match?.chunk_id ?? docId

  return {
    id: `${docId}-${payload.chunk_index}-${index}`,
    doc_name: match?.filename ?? `Doc ${docId.slice(0, 8)}`,
    doc_id: docId,
    page: 1,
    snippet: payload.snippet,
    evidence: {
      doc_id: docId,
      chunk_id: chunkId,
      page: 1,
      bbox: null,
    },
    relevance_score: match?.score ?? 0.5,
  }
}
