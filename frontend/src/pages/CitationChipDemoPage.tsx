import { useState } from 'react'
import toast from 'react-hot-toast'
import { CitationChip } from '@/components/chat/CitationChip'
import type { Citation } from '@/types/chat'

const MOCK_CITATIONS: Citation[] = [
  {
    id: 'c1',
    doc_name: 'NDA_2023.pdf',
    doc_id: '00000000-0000-0000-0000-000000000101',
    page: 47,
    section: '§3',
    snippet:
      'The Receiving Party shall not disclose any Confidential Information to third parties without prior written consent of the Disclosing Party, except as required by applicable law or court order.',
    evidence: {
      doc_id: '00000000-0000-0000-0000-000000000101',
      chunk_id: '00000000-0000-0000-0000-000000000201',
      page: 47,
      section: '§3',
      bbox: { page: 47, x0: 0.12, y0: 0.34, x1: 0.88, y1: 0.41 },
    },
    relevance_score: 0.92,
  },
  {
    id: 'c2',
    doc_name: 'SPA_Acme_2024.pdf',
    doc_id: '00000000-0000-0000-0000-000000000102',
    page: 12,
    section: '§4.2',
    snippet:
      'Seller shall indemnify Purchaser against losses arising from breaches of representations and warranties set forth in Article IV, subject to the limitations in Section 8.1.',
    evidence: {
      doc_id: '00000000-0000-0000-0000-000000000102',
      chunk_id: '00000000-0000-0000-0000-000000000202',
      page: 12,
      section: '§4.2',
      bbox: null,
    },
    relevance_score: 0.61,
  },
  {
    id: 'c3',
    doc_name: 'Board_Minutes_Q1.pdf',
    doc_id: '00000000-0000-0000-0000-000000000103',
    page: 3,
    snippet:
      'The board resolved to approve the proposed merger subject to satisfactory completion of due diligence and regulatory approvals.',
    evidence: {
      doc_id: '00000000-0000-0000-0000-000000000103',
      chunk_id: '00000000-0000-0000-0000-000000000203',
      page: 3,
      bbox: { page: 3, x0: 0.08, y0: 0.55, x1: 0.91, y1: 0.62 },
    },
    relevance_score: 0.38,
  },
]

export function CitationChipDemoPage() {
  const [lastOpened, setLastOpened] = useState<string | null>(null)

  return (
    <div className="flex h-full flex-col gap-8 p-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">CitationChip demo</h1>
        <p className="mt-1 text-sm text-gray-500">
          Hover chips to preview tooltips. Edge chips test viewport collision padding.
        </p>
        {lastOpened && (
          <p className="mt-2 text-xs text-brand-600 dark:text-brand-400">
            Last opened: {lastOpened}
          </p>
        )}
      </div>

      <div className="flex justify-start">
        <CitationChip
          citation={MOCK_CITATIONS[0]}
          onClick={(c) => {
            setLastOpened(c.doc_name)
            toast.success(`Open in viewer: ${c.doc_name}`)
          }}
        />
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        {MOCK_CITATIONS.map((citation) => (
          <CitationChip
            key={citation.id}
            citation={citation}
            onClick={(c) => {
              setLastOpened(c.doc_name)
              toast.success(`Open in viewer: ${c.doc_name}`)
            }}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <CitationChip
          citation={MOCK_CITATIONS[2]}
          onClick={(c) => {
            setLastOpened(c.doc_name)
            toast.success(`Open in viewer: ${c.doc_name}`)
          }}
        />
      </div>
    </div>
  )
}
