// Fichier: services/userService.ts
import api from './api';

export interface UserProfile {
  id: string;
  balance: string | number;
  name?: string;
}

export const UserService = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/auth/profile');
    return {
      id: response.data?.id || response.data?.user?.id,
      balance: response.data?.balance || '0',
      name: response.data.username ? response.data.username.trim() : 'Étudiant'   
      // S'adapte à la clé de ton backend
    };
  },
  
  registerPushToken: async (token: string): Promise<void> => {
    await api.post('/auth/push-token', { token });
  }
};