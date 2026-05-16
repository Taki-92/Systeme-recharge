import { create } from 'zustand';

export interface UserState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  // On remplace le booléen par un dictionnaire des sessions actives
  activeSessions: Record<string, any>; 
  addSession: (plugId: string, data: any) => void;
  removeSession: (plugId: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
  
  // Gestion de la liste des charges
  activeSessions: {},
  addSession: (plugId, data) => set((state) => ({ 
      activeSessions: { ...state.activeSessions, [plugId]: data } 
  })),
  removeSession: (plugId) => set((state) => {
      const updated = { ...state.activeSessions };
      delete updated[plugId];
      return { activeSessions: updated };
  }),
}));