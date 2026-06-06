import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface ScopeState {
  selectedDocIds: string[]
  toggleDoc: (id: string) => void
  clearScope: () => void
  isInScope: (id: string) => boolean
}

export const useScopeStore = create<ScopeState>()(
  persist(
    (set, get) => ({
      selectedDocIds: [],

      toggleDoc: (id) => {
        set((state) => {
          const exists = state.selectedDocIds.includes(id)
          return {
            selectedDocIds: exists
              ? state.selectedDocIds.filter((docId) => docId !== id)
              : [...state.selectedDocIds, id],
          }
        })
      },

      clearScope: () => set({ selectedDocIds: [] }),

      isInScope: (id) => get().selectedDocIds.includes(id),
    }),
    { name: 'dochub-scope', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)
