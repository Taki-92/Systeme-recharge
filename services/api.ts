// services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { forceLogoutFromApi } from './authLogout';

export const API_URL = process.env.EXPO_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});


api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('jwt_token');

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    } catch (error) {
      console.error('❌ Erreur lecture SecureStore (request interceptor) :', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url ?? '';

    const isPublicRoute =
      url.includes('/login') ||
      url.includes('/register');

    if (status === 401 && !isPublicRoute) {
      console.warn('🛡️ [Security] Accès refusé ou token manquant. Nettoyage...');
      await SecureStore.deleteItemAsync('jwt_token');
    }

    await forceLogoutFromApi(error);

    return Promise.reject(error);
  }
);

export default api;