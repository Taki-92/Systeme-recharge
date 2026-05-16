import api from './api';

export interface StopChargeResponse {
  cost?: string | number;
  newBalance?: string | number;
  [key: string]: any; // Au cas où le serveur renvoie d'autres infos
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