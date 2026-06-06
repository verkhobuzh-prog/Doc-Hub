import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useChatStream } from '@/hooks/useChatStream'
import { CitationChip } from '@/components/chat/CitationChip'
import type { ChatRequest, Citation } from '@/types/chat'
import { Send, Bot, User, AlertCircle, Sparkles, Square } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import toast from 'react-hot-toast'

interface DisplayMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  risk_score?: number
  risk_level?: string
  risk_warning?: string | null
}

export function ChatPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { state: streamState, send, cancel, reset } = useChatStream()

  const { data: docs = [] } = useQuery({ queryKey: ['documents'], queryFn: api.documents.list })
  const indexedDocs = docs.filter((d) => d.status === 'indexed')

  const isBusy = streamState.isStreaming

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamState.tokens, streamState.citations])

  useEffect(() => {
    if (streamState.error) {
      toast.error(streamState.error.message)
    }
  }, [streamState.error])

  const sendMessage = async () => {
    if (!input.trim() || isBusy) return
    const query = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: query }])
    reset()

    const request: ChatRequest = { query }
    const final = await send(request)

    if (final.tokens || final.citations.length > 0 || final.error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: final.tokens || (final.error ? `❌ ${final.error.message}` : ''),
          citations: final.citations,
          risk_score: final.riskScore,
          risk_level: final.riskLevel,
          risk_warning: final.riskWarning,
        },
      ])
    }

    reset()
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const handleStop = () => {
    cancel()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-2 dark:border-surface-dark-3 bg-white dark:bg-surface-dark-1">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Chat AI
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {indexedDocs.length > 0
              ? `${indexedDocs.length} документ${indexedDocs.length === 1 ? '' : 'ів'} в базі знань`
              : 'Спочатку завантажте документи'}
          </p>
        </div>
        {isBusy && (
          <button
            type="button"
            onClick={handleStop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
        )}
      </div>

      {indexedDocs.length === 0 && (
        <div className="mx-6 mt-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Немає проіндексованих документів. Перейдіть до <strong>Документи</strong> та завантажте файли.
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !isBusy && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center pb-8">
            <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
              <Bot className="w-8 h-8 text-brand-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-1">Запитайте про ваші документи</p>
              <p className="text-sm text-gray-400">Отримуйте відповіді з точними цитатами з джерел</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-w-lg">
              {[
                'Що є головним у цих документах?',
                'Які ключові дати та терміни?',
                "Перелічи головні зобов'язання сторін",
                'Які є ризики та застереження?',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setInput(q)
                    inputRef.current?.focus()
                  }}
                  className="text-left text-xs p-3 rounded-lg border border-surface-2 dark:border-surface-dark-3 text-gray-600 dark:text-gray-400 hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {isBusy && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-surface-dark-2 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-gray-500" />
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white dark:bg-surface-dark-1 border border-surface-2 dark:border-surface-dark-3 text-gray-900 dark:text-gray-100 text-sm">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamState.tokens}
                  </ReactMarkdown>
                  <span className="inline-block w-2 animate-pulse text-brand-500" aria-hidden>
                    ▊
                  </span>
                </div>
              </div>
              {streamState.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {streamState.citations.map((citation) => (
                    <CitationChip key={citation.id} citation={citation} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-surface-2 dark:border-surface-dark-3 bg-white dark:bg-surface-dark-1">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Задайте питання про документи... (Enter — відправити, Shift+Enter — новий рядок)"
              className="input resize-none min-h-[44px] max-h-32 py-2.5 pr-4 leading-relaxed"
              rows={1}
              disabled={isBusy || indexedDocs.length === 0}
            />
          </div>
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isBusy || indexedDocs.length === 0}
            className="btn-primary py-2.5 px-4 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: DisplayMessage }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-brand-100 dark:bg-brand-900/30' : 'bg-gray-100 dark:bg-surface-dark-2'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-brand-600" />
        ) : (
          <Bot className="w-4 h-4 text-gray-500" />
        )}
      </div>
      <div className={`flex-1 max-w-2xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-brand-600 text-white rounded-tr-sm'
              : 'bg-white dark:bg-surface-dark-1 border border-surface-2 dark:border-surface-dark-3 text-gray-900 dark:text-gray-100 rounded-tl-sm'
          }`}
        >
          {!isUser && (msg.risk_score ?? 0) > 50 && (
            <div className="mb-3 flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Low-confidence information. Risk: <strong>{msg.risk_level ?? 'unknown'}</strong>
                {msg.risk_warning ? ` — ${msg.risk_warning}` : ''}
              </span>
            </div>
          )}
          {isUser ? (
            msg.content
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && msg.citations && msg.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {msg.citations.map((citation) => (
              <CitationChip key={citation.id} citation={citation} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
