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
      setMyPlayerIndex: (index) => set({ myPlayerIndex: index }),
    }),
    {
      name: "monopoly-client-storage",
    }
  )
);
