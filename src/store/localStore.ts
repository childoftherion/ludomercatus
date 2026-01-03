import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LocalState {
  myPlayerIndex: number | null;
  clientId: string;
  setMyPlayerIndex: (index: number | null) => void;
}

export const useLocalStore = create<LocalState>()(
  persist(
    (set) => ({
      myPlayerIndex: null,
      clientId: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
      setMyPlayerIndex: (index) => {
        console.log("[LocalStore] Setting myPlayerIndex:", index, {
          previousValue: useLocalStore.getState().myPlayerIndex,
          stackTrace: new Error().stack,
        });
        set({ myPlayerIndex: index });
      },
    }),
    {
      name: "ludomercatus-client-storage",
      onRehydrateStorage: () => (state) => {
        console.log("[LocalStore] Rehydrated from storage:", {
          myPlayerIndex: state?.myPlayerIndex,
          clientId: state?.clientId,
        });
      },
    }
  )
);
