// services/api.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * CONFIGURATION DE L'INSTANCE
 * On s'assure que l'URL de base est bien définie pour éviter les appels "undefined"
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://recharge.cielnewton.fr';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // 15 secondes max pour les réseaux mobiles instables
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * INTERCEPTEUR DE REQUÊTE (Identity Injection)
 * C'est ici que l'on "badge" chaque appel vers le serveur.
 */
api.interceptors.request.use(
  async (config) => {
    try {
      /**
       * CORRECTION CRITIQUE : 
       * On utilise 'jwt_token' pour correspondre à ton stockage actuel.
       */
      const token = await SecureStore.getItemAsync('jwt_token');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      return config;
    } catch (error) {
      // En cas d'erreur de lecture du stockage, on laisse passer la requête sans badge
      return config;
    }
  },
  (error) => Promise.reject(error)
);

/**
 * INTERCEPTEUR DE RÉPONSE (Security Guard)
 * On surveille si le serveur nous dit que notre badge n'est plus valide.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Si le serveur renvoie 401 (Unauthorized)
    if (error.response?.status === 401) {
      console.warn("🛡️ [Security] Accès refusé ou Token expiré. Nettoyage...");
      
      // On supprime le token corrompu/expiré pour forcer une reconnexion propre
      await SecureStore.deleteItemAsync('jwt_token');
      
      // Note : La redirection vers le login est gérée par les composants 
      // ou peut être ajoutée ici via un gestionnaire de navigation global.
    }
    
    return Promise.reject(error);
  }
);

export default api;