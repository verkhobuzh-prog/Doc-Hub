import { useAuthStore } from '@/stores/authStore'
import type {
  ChatRequest,
  ChatStreamEvent,
  Citation,
  StreamCitationPayload,
  StreamSource,
} from '@/types/chat'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export type ChatStreamHandler = (event: ChatStreamEvent) => void

export class ChatStreamError extends Error {
  readonly code: 'network' | 'parse' | 'http'

  constructor(code: 'network' | 'parse' | 'http', message: string) {
    super(message)
    this.name = 'ChatStreamError'
    this.code = code
  }
}

export interface ChatSendOptions {
  request: ChatRequest
  onEvent: ChatStreamHandler
  signal?: AbortSignal
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Parse and narrow unknown SSE JSON to `ChatStreamEvent`. */
export function parseChatStreamEvent(raw: unknown): ChatStreamEvent {
  if (!isRecord(raw) || typeof raw.type !== 'string') {
    throw new ChatStreamError('parse', 'Invalid stream event shape')
  }

  switch (raw.type) {
    case 'sources':
      if (!Array.isArray(raw.sources)) {
        throw new ChatStreamError('parse', 'Invalid sources event')
      }
      return { type: 'sources', sources: raw.sources as StreamSource[] }
    case 'token':
      if (typeof raw.content !== 'string') {
        throw new ChatStreamError('parse', 'Invalid token event')
      }
      return { type: 'token', content: raw.content }
    case 'citation':
      if (!isRecord(raw.citation)) {
        throw new ChatStreamError('parse', 'Invalid citation event')
      }
      return { type: 'citation', citation: raw.citation as unknown as Citation }
    case 'confidence':
      if (typeof raw.score !== 'number') {
        throw new ChatStreamError('parse', 'Invalid confidence event')
      }
      return { type: 'confidence', score: raw.score }
    case 'done':
      if (typeof raw.answer !== 'string' || !Array.isArray(raw.citations)) {
        throw new ChatStreamError('parse', 'Invalid done event')
      }
      return {
        type: 'done',
        answer: raw.answer,
        citations: raw.citations as StreamCitationPayload[],
        model: typeof raw.model === 'string' ? raw.model : '',
        risk_score: typeof raw.risk_score === 'number' ? raw.risk_score : undefined,
        risk_level: typeof raw.risk_level === 'string' ? raw.risk_level : undefined,
        risk_warning: typeof raw.risk_warning === 'string' ? raw.risk_warning : null,
        low_confidence_facts:
          typeof raw.low_confidence_facts === 'number' ? raw.low_confidence_facts : undefined,
        disputed_facts: typeof raw.disputed_facts === 'number' ? raw.disputed_facts : undefined,
        total_facts_analyzed:
          typeof raw.total_facts_analyzed === 'number' ? raw.total_facts_analyzed : undefined,
      }
    case 'error':
      if (typeof raw.error !== 'string') {
        throw new ChatStreamError('parse', 'Invalid error event')
      }
      return { type: 'error', error: raw.error }
    default:
      throw new ChatStreamError('parse', `Unknown stream event type: ${raw.type}`)
  }
}

function buildStreamRequestBody(request: ChatRequest): Record<string, unknown> {
  return {
    query: request.query,
    document_ids: request.context_doc_ids,
    top_k: 8,
    stream: true,
  }
}

async function consumeSSE(
  body: ReadableStream<Uint8Array>,
  onEvent: ChatStreamHandler,
  signal?: AbortSignal,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        return
      }

      const { done, value } = await reader.read()
      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      let boundary = buffer.indexOf('\n\n')
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)

        for (const line of block.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) {
            continue
          }
          const payload = trimmed.slice(5).trim()
          if (payload === '[DONE]') {
            return
          }
          if (!payload) {
            continue
          }

          let parsed: unknown
          try {
            parsed = JSON.parse(payload)
          } catch {
            throw new ChatStreamError('parse', 'Failed to parse SSE JSON payload')
          }
          onEvent(parseChatStreamEvent(parsed))
        }

        boundary = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** POST `/api/v1/chat` with SSE parsing. Resolves when stream ends or aborts (no throw on abort). */
export async function chatSend({ request, onEvent, signal }: ChatSendOptions): Promise<void> {
  if (signal?.aborted) {
    return
  }

  const token = useAuthStore.getState().token

  let res: Response
  try {
    res = await fetch(`${BASE}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(buildStreamRequestBody(request)),
      signal,
    })
  } catch (err) {
    if (signal?.aborted) {
      return
    }
    const message = err instanceof Error ? err.message : 'Network request failed'
    throw new ChatStreamError('network', message)
  }

  if (signal?.aborted) {
    return
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ detail: res.statusText }))
    const detail =
      isRecord(errBody) && typeof errBody.detail === 'string'
        ? errBody.detail
        : res.statusText
    throw new ChatStreamError('http', detail || `HTTP ${res.status}`)
  }

  if (!res.body) {
    throw new ChatStreamError('network', 'Response body is empty')
  }

  await consumeSSE(res.body, onEvent, signal)
}
