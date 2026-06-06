import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Citation } from '@/types/chat'

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({ token: 'test-token' }),
  },
}))

import { chatSend } from '@/lib/chatStream'

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
}

const mockCitation: Citation = {
  id: 'c1',
  doc_name: 'NDA.pdf',
  doc_id: '00000000-0000-0000-0000-000000000101',
  page: 1,
  snippet: 'Sample snippet text for citation.',
  evidence: {
    doc_id: '00000000-0000-0000-0000-000000000101',
    chunk_id: '00000000-0000-0000-0000-000000000201',
    page: 1,
    bbox: null,
  },
  relevance_score: 0.9,
}

describe('chatSend', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('parses token and citation SSE events via onEvent', async () => {
    const events: string[] = []

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: sseStream([
          'data: {"type":"token","content":"Hello"}\n\n',
          'data: {"type":"token","content":" world"}\n\n',
          `data: ${JSON.stringify({ type: 'citation', citation: mockCitation })}\n\n`,
          'data: [DONE]\n\n',
        ]),
      }),
    )

    await chatSend({
      request: { query: 'test' },
      onEvent: (event) => {
        events.push(event.type)
      },
    })

    expect(events).toEqual(['token', 'token', 'citation'])
  })

  it('resolves without throw when AbortSignal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()

    await expect(
      chatSend({
        request: { query: 'test' },
        onEvent: () => {},
        signal: controller.signal,
      }),
    ).resolves.toBeUndefined()
  })

  it('throws ChatStreamError with code network on fetch failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

    await expect(
      chatSend({
        request: { query: 'test' },
        onEvent: () => {},
      }),
    ).rejects.toMatchObject({ code: 'network' })
  })
})
