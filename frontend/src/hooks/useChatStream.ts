import { useCallback, useRef, useState } from 'react'
import { chatSend, ChatStreamError } from '@/lib/chatStream'
import { mapStreamCitationToUi } from '@/lib/mapStreamCitation'
import type { ChatRequest, Citation } from '@/types/chat'

export interface ChatStreamState {
  isStreaming: boolean
  tokens: string
  citations: Citation[]
  confidenceScore: number | null
  riskScore: number
  riskLevel: string
  riskWarning: string | null
  error: ChatStreamError | null
}

const INITIAL_STATE: ChatStreamState = {
  isStreaming: false,
  tokens: '',
  citations: [],
  confidenceScore: null,
  riskScore: 0,
  riskLevel: 'low',
  riskWarning: null,
  error: null,
}

export function useChatStream(): {
  state: ChatStreamState
  send: (request: ChatRequest) => Promise<ChatStreamState>
  cancel: () => void
  reset: () => void
} {
  const [state, setState] = useState<ChatStreamState>(INITIAL_STATE)
  const liveRef = useRef<ChatStreamState>(INITIAL_STATE)
  const abortRef = useRef<AbortController | null>(null)
  const sourcesRef = useRef<import('@/types/chat').StreamSource[]>([])
  const pendingTokensRef = useRef('')
  const rafRef = useRef<number | null>(null)

  const flushTokens = useCallback(() => {
    const chunk = pendingTokensRef.current
    if (!chunk) {
      return
    }
    pendingTokensRef.current = ''
    setState((prev) => {
      const next = { ...prev, tokens: prev.tokens + chunk }
      liveRef.current = next
      return next
    })
  }, [])

  const scheduleTokenFlush = useCallback(() => {
    if (rafRef.current !== null) {
      return
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      flushTokens()
    })
  }, [flushTokens])

  const reset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    pendingTokensRef.current = ''
    sourcesRef.current = []
    liveRef.current = INITIAL_STATE
    setState(INITIAL_STATE)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    flushTokens()
  }, [flushTokens])

  const send = useCallback(
    async (request: ChatRequest): Promise<ChatStreamState> => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      sourcesRef.current = []
      pendingTokensRef.current = ''
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }

      setState({
        ...INITIAL_STATE,
        isStreaming: true,
      })
      liveRef.current = {
        ...INITIAL_STATE,
        isStreaming: true,
      }

      try {
        await chatSend({
          request,
          signal: controller.signal,
          onEvent: (event) => {
            if (controller.signal.aborted) {
              return
            }

            switch (event.type) {
              case 'sources':
                sourcesRef.current = event.sources
                break
              case 'token':
                pendingTokensRef.current += event.content
                scheduleTokenFlush()
                break
              case 'citation':
                setState((prev) => {
                  const next = {
                    ...prev,
                    citations: [...prev.citations, event.citation],
                  }
                  liveRef.current = next
                  return next
                })
                break
              case 'confidence':
                setState((prev) => {
                  const next = { ...prev, confidenceScore: event.score }
                  liveRef.current = next
                  return next
                })
                break
              case 'done': {
                if (rafRef.current !== null) {
                  cancelAnimationFrame(rafRef.current)
                  rafRef.current = null
                }
                pendingTokensRef.current = ''
                const mapped = event.citations.map((c, i) =>
                  mapStreamCitationToUi(c, sourcesRef.current, i),
                )
                setState((prev) => {
                  const next = {
                    ...prev,
                    tokens: event.answer || prev.tokens,
                    citations: mapped.length > 0 ? mapped : prev.citations,
                    confidenceScore:
                      event.risk_score !== undefined
                        ? Math.max(0, Math.min(1, 1 - event.risk_score / 100))
                        : prev.confidenceScore,
                    riskScore: event.risk_score ?? prev.riskScore,
                    riskLevel: event.risk_level ?? prev.riskLevel,
                    riskWarning: event.risk_warning ?? null,
                    isStreaming: false,
                  }
                  liveRef.current = next
                  return next
                })
                break
              }
              case 'error':
                setState((prev) => {
                  const next = {
                    ...prev,
                    error: new ChatStreamError('parse', event.error),
                    isStreaming: false,
                  }
                  liveRef.current = next
                  return next
                })
                break
              default:
                break
            }
          },
        })

        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        flushTokens()

        setState((prev) => {
          const next = prev.isStreaming ? { ...prev, isStreaming: false } : prev
          liveRef.current = next
          return next
        })
        return liveRef.current
      } catch (err) {
        if (controller.signal.aborted) {
          flushTokens()
          setState((prev) => {
            const next = { ...prev, isStreaming: false }
            liveRef.current = next
            return next
          })
          return liveRef.current
        }
        const streamError =
          err instanceof ChatStreamError
            ? err
            : new ChatStreamError(
                'network',
                err instanceof Error ? err.message : 'Stream failed',
              )
        setState((prev) => {
          const next = {
            ...prev,
            error: streamError,
            isStreaming: false,
          }
          liveRef.current = next
          return next
        })
        return liveRef.current
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [flushTokens, scheduleTokenFlush],
  )

  return { state, send, cancel, reset }
}
