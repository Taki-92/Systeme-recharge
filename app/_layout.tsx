

import { Ionicons } from '@expo/vector-icons';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-reanimated';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { io } from 'socket.io-client';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { UserService } from '../services/userService';
import { useUserStore } from '../store/useUserStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { expoPushToken } = usePushNotifications();
  const userId = useUserStore((state) => state.userId);
  const removeSession = useUserStore((state) => state.removeSession);
  const router = useRouter();

  const [interruptionInfo, setInterruptionInfo] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    let ignore = false;

    async function syncPushToken() {
      if (!expoPushToken) return;

      // Vérifier qu'on a bien un JWT avant d'envoyer le push token
      const jwt = await SecureStore.getItemAsync('jwt_token');
      if (!jwt) {
        console.log('⏸️ Pas de JWT disponible, synchro du push token annulée.');
        return;
      }

      try {
        await UserService.registerPushToken(expoPushToken);
      } catch (error: unknown) {
        if (!ignore) {
          console.error('❌ Erreur de synchronisation du Push Token:', error);
        }
      }
    }

    syncPushToken();

    return () => {
      ignore = true;
    };
  }, [expoPushToken]);

  useEffect(() => {
    if (!userId) return;

    const baseURL = process.env.EXPO_PUBLIC_API_URL ;
    const socket = io(baseURL, {
      path: '/socket.io',
      transports: ['websocket'],
    });

    // Typage de l'événement Socket pour sécuriser le build
    socket.on('session_auto_stopped', (data: { userId?: string, plugId?: string, message?: string }) => {

      // Si le serveur envoie un userId, on filtre. Sinon, on passe à la suite.
      if (data?.userId && data.userId !== userId) {
          return; 
      }

      // Si le serveur indique quelle prise est arrêtée, on la supprime
      if (data?.plugId) {
          removeSession(data.plugId);
      }

      const message = data?.message || "Un administrateur a coupé votre session.";
      const title = message.toLowerCase().includes('maintenance') ? "Borne en Maintenance" : "Session terminée";
      setInterruptionInfo({ title, message });
    });

    return () => {
      socket.off('session_auto_stopped');
      socket.disconnect();
    };
  }, [userId, removeSession]);

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
            <TouchableOpacity 
              style={modalStyles.button}
              onPress={() => {
                setInterruptionInfo(null);
                router.replace('/acceuil');
              }}
            >
              <Text style={modalStyles.buttonText}>OK</Text>
            </TouchableOpacity>
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
});