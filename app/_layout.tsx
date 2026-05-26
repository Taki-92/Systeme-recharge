

import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { io } from 'socket.io-client';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useNotificationStore } from '../store/useNotificationStore';
import { UserState, useUserStore } from '../store/useUserStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(userToken: string | null) {
  let token;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permission refusée !');
      return;
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (userToken) {
        await fetch('https://recharge.cielnewton.fr/api/auth/push-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`,
          },
          body: JSON.stringify({ pushToken: token }),
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
  return token;
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { notification } = usePushNotifications();
  const userId = useUserStore((state) => state.userId);
  const token = useUserStore((state: any) => state.token);
  const removeSession = useUserStore((state) => state.removeSession);
  const updateSessionData = useUserStore((state: UserState) => state.updateSessionData);
  const router = useRouter();

  const [interruptionInfo, setInterruptionInfo] = useState<{ title: string; message: string; reason?: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function setupPushNotifications() {
      if (token) {
        try {
          await registerForPushNotificationsAsync(token);
        } catch (error) {
          if (!ignore) {
            console.error('❌ Erreur d\'enregistrement des notifications:', error);
          }
        }
      }
    }

    setupPushNotifications();

    return () => {
      ignore = true;
    };
  }, [token]);

  // 🔔 Écoute des notifications Push entrantes pour remplir la cloche
  useEffect(() => {
    if (notification && userId) {
      const title = notification.request.content.title || 'Nouvelle notification';
      const body = notification.request.content.body || '';
      useNotificationStore.getState().addNotification(userId, title, body);
    }
  }, [notification, userId]);

  useEffect(() => {
    if (!userId) return;

    let socket: any = null;

    async function initSocket() {
      // 🔐 Récupération asynchrone du JWT
      const token = await SecureStore.getItemAsync('jwt_token');
      const baseURL = process.env.EXPO_PUBLIC_API_URL || '';

      socket = io(baseURL, {
        path: '/socket.io',
        transports: ['websocket'],
        auth: { token }, // ✅ On passe le JWT à l'initialisation
      });

      // 🎧 Écouteurs d'états de la connexion
      socket.on('connect', () => {
    
        // Demande pour rejoindre une room avec l'ID utilisateur
        socket.emit('join', userId);
      });

      socket.on('connect_error', (error: any) => {
        console.error('❌ [SOCKET] Erreur de connexion:', error.message);
      });

      socket.on('disconnect', (reason: string) => {
        console.warn('⚠️ [SOCKET] Déconnecté. Raison:', reason);
      });

      // ⚡ Écoute de la puissance instantanée (Watts)
      socket.on('power_update', (data: any) => {

        const cleanPlugId = data?.plugId ? String(data.plugId).trim() : '';
        
        // Filtrage strict : on ignore l'événement si la session n'existe pas localement
        if (!useUserStore.getState().activeSessions[cleanPlugId]) return;

        if (cleanPlugId && updateSessionData) {
          // Le serveur envoie { plugId, power }
          updateSessionData(cleanPlugId, { power: data.power });
        }
      });

      // 🔋 Écoute de l'énergie et de la facturation (Wh, €, Solde)
      socket.on('live_consumption', (data: any) => {

        // Le serveur filtre côté backend, mais on vérifie l'userId par sécurité
        if (data?.userId && String(data.userId) !== String(userId)) return;
        
        const cleanPlugId = data?.plugId ? String(data.plugId).trim() : '';
        
        // Filtrage strict : on ignore l'événement si la session n'existe pas localement
        if (!useUserStore.getState().activeSessions[cleanPlugId]) return;

        if (cleanPlugId && updateSessionData) {
          // Le serveur envoie { plugId, energyWh, cost, newBalance }
          updateSessionData(cleanPlugId, { 
            energyWh: data.energyWh, 
            cost: data.cost 
          });

          // 💸 Mise à jour instantanée du solde global si le backend l'envoie
          if (data.newBalance !== undefined) {
            useUserStore.getState().setBalance(Number(data.newBalance));
          }
        }
      });

      // Typage de l'événement Socket pour sécuriser le build
      socket.on('session_auto_stopped', (data: { 
        userId: number; 
        plugId: string; 
        reason: 'solde_epuise' | 'surcharge_puissance' | 'admin_force_stop' | 'maintenance'; 
        message: string; 
      }) => {
        if (data?.userId && String(data.userId) !== String(userId)) {
            return; 
        }

        let statsMessage = "";

        if (data?.plugId) {
            // Récupération des dernières valeurs connues dans Zustand juste avant la suppression
            const lastStats = useUserStore.getState().activeSessions[data.plugId];
            if (lastStats) {
                const finalCost = Number(lastStats.cost || 0).toFixed(2);
                const finalEnergy = Number(lastStats.energyWh || 0).toFixed(1);
                const currentBalance = Number(useUserStore.getState().balance || 0).toFixed(2);
                
                statsMessage = `\n\n Énergie consommée : ${finalEnergy} Wh\nCoût de la session : ${finalCost} €\n Votre nouveau solde : ${currentBalance} €`;
            }
            removeSession(data.plugId);
        }
        const baseMessage = data?.message || "Un administrateur a coupé votre session.";
        const title = baseMessage.toLowerCase().includes('maintenance') ? "Borne en Maintenance" : "Session terminée";
        
        // 🔔 Ajout dans l'historique des notifications (silencieux pour la cloche)
        if (userId) {
          useNotificationStore.getState().addNotification(userId, title, baseMessage);
        }

        setInterruptionInfo({ title, message: baseMessage + statsMessage, reason: data.reason });
      });

      // 🔄 Écoute des changements de statut (Libre / Occupé)
      socket.on('status_update', (data: { plugId: string; status: string }) => {
        console.log("🔄 [SOCKET] Status Update reçu :", data);
        if (data?.status === 'libre' && data?.plugId) {
          // Si la prise redevient libre, on la supprime des sessions en cours
          removeSession(data.plugId);
        }
      });
    }

    initSocket();

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('connect_error');
        socket.off('disconnect');
        socket.off('power_update');
        socket.off('live_consumption');
        socket.off('session_auto_stopped');
        socket.off('status_update');
        socket.disconnect();
      }
    };
  }, [userId, removeSession, updateSessionData]);

  const toastConfig = {
    success: (props: any) => (
      <BaseToast
        {...props}
        style={{
          borderLeftColor: '#8A2BE2',
          backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderRadius: 12,
          borderLeftWidth: 8,
          top: 60,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 17,
          fontWeight: 'bold',
          color: colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A',
        }}
        text2Style={{
          fontSize: 15,
          color: colorScheme === 'dark' ? '#AAAAAA' : '#666666',
        }}
      />
    ),
    error: (props: any) => (
      <ErrorToast
        {...props}
        style={{
          borderLeftColor: '#D32F2F',
          backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          borderRadius: 12,
          borderLeftWidth: 8,
          top: 60,
        }}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        text1Style={{
          fontSize: 17,
          fontWeight: 'bold',
          color: colorScheme === 'dark' ? '#FFFFFF' : '#1A1A1A',
        }}
        text2Style={{
          fontSize: 15,
          color: colorScheme === 'dark' ? '#AAAAAA' : '#666666',
        }}
      />
    ),
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="recharge" options={{ headerShown: false }} />
        <Stack.Screen name="historique" options={{ headerShown: false }} />
        <Stack.Screen name="transactions" options={{ headerShown: false }} />
        <Stack.Screen name="activation" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
      <Toast config={toastConfig} />

      <Modal transparent={true} visible={interruptionInfo !== null} animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={modalStyles.alertBox}>
            <Ionicons name="information-circle" size={45} color="#8A2BE2" style={modalStyles.icon} />
            <Text style={modalStyles.title}>{interruptionInfo?.title}</Text>
            <Text style={modalStyles.message}>{interruptionInfo?.message}</Text>
            {interruptionInfo?.reason === 'solde_epuise' ? (
              <View style={{ width: '100%', gap: 10 }}>
                <TouchableOpacity 
                  style={modalStyles.button}
                  onPress={() => {
                    setInterruptionInfo(null);
                    router.push('/recharge');
                  }}
                >
                  <Text style={modalStyles.buttonText}>Recharger mon solde</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={modalStyles.secondaryButton}
                  onPress={() => {
                    setInterruptionInfo(null);
                    router.replace('/acceuil');
                  }}
                >
                  <Text style={modalStyles.secondaryButtonText}>Retour à l'accueil</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={modalStyles.button}
                onPress={() => {
                  setInterruptionInfo(null);
                  router.replace('/acceuil');
                }}
              >
                <Text style={modalStyles.buttonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </ThemeProvider>
  );
} 

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 25,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  icon: {
    marginBottom: 15,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    color: '#B0B0B0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#AAAAAA',
    fontSize: 16,
  },
});