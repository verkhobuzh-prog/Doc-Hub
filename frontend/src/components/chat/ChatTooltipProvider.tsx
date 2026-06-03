import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export interface ChatTooltipProviderProps {
  children: ReactNode
  /** Hover delay before tooltip opens (ms). */
  delayDuration?: number
}

/** App-level Radix tooltip provider for chat citation chips. */
export function ChatTooltipProvider({
  children,
  delayDuration = 200,
}: ChatTooltipProviderProps) {
  return (
    <Tooltip.Provider delayDuration={delayDuration} skipDelayDuration={0}>
      {children}
    </Tooltip.Provider>
  )
}
