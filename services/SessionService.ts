import api from './api';

export interface StopChargeResponse {
  cost?: string | number;
  newBalance?: string | number;
  [key: string]: any; // Au cas où le serveur renvoie d'autres infos
}

export interface ActiveSession {
  id: number;              // ID unique de la session
  user_id: number;         // ID de l'utilisateur
  plug_id: string;         // Ex: "Prise3"
  start_time: string;      // Date ISO 8601
  end_time: string | null; // null si en cours
  index_start: number;     // Index de départ (Wh)
  energy_kwh: number;      // Énergie (0 pendant)
  cost: number;            // Coût (0 pendant)
}

export const SessionService = {
  startCharging: async (plugId: string): Promise<void> => {
    await api.post('/api/plugs/start', { plugId });
  },

  stopCharging: async (plugId: string): Promise<StopChargeResponse> => {
    const response = await api.post<StopChargeResponse>('/api/plugs/stop', { plugId });
    return response.data;
  },

  getPlugStatus: async (plugId: string): Promise<any> => {
    const response = await api.get(`/api/plugs/${plugId}/status`);
    return response.data;
  }
};