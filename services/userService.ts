// Fichier: services/userService.ts
import api from './api';

export interface UserProfile {
  id: string;
  balance: string | number;
}

export const UserService = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/api/auth/profile');
    return {
      id: response.data?.id || response.data?.user?.id,
      balance: response.data?.balance || '0'
    };
  },
  
  registerPushToken: async (token: string): Promise<void> => {
    await api.post('/api/auth/push-token', { token });
  }
};