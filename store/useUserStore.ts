import { create } from 'zustand';

export interface UserState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  balance: number;
  setBalance: (balance: number) => void;
  // On remplace le booléen par un dictionnaire des sessions actives
  activeSessions: Record<string, any>; 
  addSession: (plugId: string, data: any) => void;
  removeSession: (plugId: string) => void;
  updateSessionData: (plugId: string, data: any) => void;
  clearStore: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
  
  balance: 0,
  setBalance: (balance) => set({ balance }),
  
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
  
  updateSessionData: (plugId, data) => set((state) => {
      const currentSession = state.activeSessions[plugId] || {};

      let safeCost = data?.cost !== undefined ? Number(String(data.cost).replace('€', '').trim()) : (currentSession.cost ?? 0);
      let safeEnergy = data?.energyWh !== undefined ? Number(data.energyWh) : (currentSession.energyWh ?? 0);
      let safePower = data?.power !== undefined ? Number(data.power) : (currentSession.power ?? 0);

      if (isNaN(safeCost)) safeCost = 0;
      if (isNaN(safeEnergy)) safeEnergy = 0;
      if (isNaN(safePower)) safePower = 0;

      return { 
          activeSessions: { 
              ...state.activeSessions, 
              [plugId]: { 
                  ...currentSession, 
                  ...data,
                  cost: safeCost, 
                  energyWh: safeEnergy, 
                  power: safePower 
              } 
          } 
      };
  }),
  
  clearStore: () => set({ userId: null, activeSessions: {}, balance: 0 }),
}));