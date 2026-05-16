// Fichier : services/authService.ts
import api from './api';

export interface LoginResponse {
  token: string;
  /// Modèle de données : On définit ici tout ce que l'API nous donne après la connexion (Token, infos profil, etc.)
}

export const AuthService = {
  login: async (email: string, password: string, deviceId: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', { 
      email: email.trim(), 
      password, 
      deviceId 
    });
    return response.data;
  }
};