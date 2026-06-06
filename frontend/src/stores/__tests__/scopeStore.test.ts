import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const backing = new Map<string, string>()
  const storage = {
    get length() {
      return backing.size
    },
    clear: () => backing.clear(),
    getItem: (key: string) => backing.get(key) ?? null,
    key: (index: number) => [...backing.keys()][index] ?? null,
    removeItem: (key: string) => {
      backing.delete(key)
    },
    setItem: (key: string, value: string) => {
      backing.set(key, value)
    },
  } satisfies Storage
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('window', { localStorage: storage })
})

import { useScopeStore } from '@/stores/scopeStore'

describe('scopeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useScopeStore.setState({ selectedDocIds: [] })
  })

  it('toggles document selection', () => {
    const { toggleDoc, isInScope } = useScopeStore.getState()

    toggleDoc('doc-a')
    expect(useScopeStore.getState().selectedDocIds).toEqual(['doc-a'])
    expect(isInScope('doc-a')).toBe(true)

    toggleDoc('doc-a')
    expect(useScopeStore.getState().selectedDocIds).toEqual([])
    expect(isInScope('doc-a')).toBe(false)
  })

  it('clears all selected documents', () => {
    const store = useScopeStore.getState()
    store.toggleDoc('doc-1')
    store.toggleDoc('doc-2')
    store.clearScope()
    expect(useScopeStore.getState().selectedDocIds).toEqual([])
  })

  it('persists selection to localStorage', () => {
    useScopeStore.getState().toggleDoc('doc-persist')
    const raw = localStorage.getItem('dochub-scope')
    expect(raw).toBeTruthy()

    const parsed = JSON.parse(raw!) as { state: { selectedDocIds: string[] } }
    expect(parsed.state.selectedDocIds).toContain('doc-persist')
  })
})
