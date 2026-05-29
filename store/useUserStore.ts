import { create } from 'zustand';

export interface UserState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  userName: string | null;
  setUserName: (name: string | null) => void;
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
  
  userName: null,
  setUserName: (name) => set({ userName: name }),

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
      let safeVoltage = data?.voltage !== undefined ? Number(data.voltage) : (currentSession.voltage ?? 0);

      if (isNaN(safeCost)) safeCost = 0;
      if (isNaN(safeEnergy)) safeEnergy = 0;
      if (isNaN(safePower)) safePower = 0;
      if (isNaN(safeVoltage)) safeVoltage = 0;

      return { 
          activeSessions: { 
              ...state.activeSessions, 
              [plugId]: { 
                  ...currentSession, 
                  cost: safeCost, 
                  energyWh: safeEnergy, 
                  power: safePower,
                  voltage: safeVoltage,
              } 
          } 
      };
  }),
  
  clearStore: () => set({ userId: null, userName: null, activeSessions: {}, balance: 0 }),
}));