import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface LocalState {
  clientId: string
}

export const useLocalStore = create<LocalState>()(
  persist(
    set => ({
      clientId:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
    }),
    {
      name: 'ludomercatus-client-storage',
      onRehydrateStorage: () => state => {
        console.log('[LocalStore] Rehydrated from storage:', {
          clientId: state?.clientId,
        })
      },
    },
  ),
)
