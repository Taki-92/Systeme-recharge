// services/authLogout.ts
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export async function forceLogoutFromApi(error: any): Promise<void> {
  const status = error?.response?.status;
  const message = error?.response?.data?.error;
  const url = error?.config?.url ?? '';

  const isPublicRoute =
    url.includes('/login') ||
    url.includes('/register');

  if (isPublicRoute) {
    return;
  }

  if (status === 403 && message === 'Token invalide ou expiré.') {
    console.warn('🛡️ [Security] Token JWT invalide ou expiré détecté (403). Déconnexion forcée.');

    try {
      await SecureStore.deleteItemAsync('jwt_token');
    } catch (storageError) {
      console.error('Erreur lors de la suppression du jwt_token :', storageError);
    }

    router.replace('/');
  }
}