import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';
import { io } from 'socket.io-client';

// On utilise uniquement l'instance centralisée API
import api from '../../services/api';
import { styles } from '../../styles/acceuil.styles';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function AccueilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [solde, setSolde] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [activeSessions, setActiveSessions] = useState<Record<string, any>>({});

  /**
   * RECUPERATION DU SOLDE
   * Utilise l'instance 'api' qui injecte automatiquement le JWT
   */
  const fetchSolde = async () => {
    try {
      const response = await api.get('/api/auth/profile');
      const id = response.data?.id || response.data?.user?.id;
      if (id) setUserId(id);
      
      const soldeRecu = parseFloat(response.data?.balance || '0');
      setSolde(soldeRecu);
    } catch (error: any) {
      console.error("[Accueil] Erreur Profile:", error?.response?.data || error.message);
      
      // Sécurité (Sans Axios) : Si 401 (Non autorisé), on nettoie et on redirige vers le login
      if (error?.response?.status === 401) {
        await SecureStore.deleteItemAsync('jwt_token');
        router.replace('/');
      }
    } finally {
      setIsCheckingToken(false);
    }
  };

  /**
   * On utilise useFocusEffect pour forcer le rechargement des données 
   * À CHAQUE FOIS que l'utilisateur arrive sur cet écran (même après une reconnexion).
   */
  useFocusEffect(
    useCallback(() => {
      fetchSolde();
    }, [])
  );

  /**
   * GESTION DES NOTIFICATIONS PUSH
   */
  useEffect(() => {
    if (!userId) return;

    const registerForPushNotificationsAsync = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#8A2BE2',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) return;

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenData.data;

        if (expoPushToken) {
          // Sauvegarde du token push via l'instance sécurisée
          await api.post('/api/auth/push-token', { token: expoPushToken });
        }
      } catch (error) {
        console.error("🚨 Erreur Push Token:", error);
      }
    };

    registerForPushNotificationsAsync();
  }, [userId]);

  /**
   * GESTION WEBSOCKETS (SOLDE & SESSIONS)
   */
  useEffect(() => {
    if (!userId) return;

    // NETTOYAGE : Utilisation de l'URL dynamique pour les WebSockets
    const baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://recharge.cielnewton.fr';
    const socket = io(baseURL, {
      path: "/api/socket.io",
      transports: ['websocket']
    });

    socket.on('user_data_updated', (data) => {
      if (data.userId === userId) {
        fetchSolde();
      }
    });

    socket.on('live_consumption', (data) => {
      if (data.userId === userId) {
        setActiveSessions((prev) => ({
          ...prev,
          [data.plugId]: data
        }));
      }
    });

    socket.on('session_auto_stopped', (data) => {
      if (data.userId === userId && data.plugId) {
        setActiveSessions((prev) => {
          const updated = { ...prev };
          delete updated[data.plugId];
          return updated;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  // Nettoyage manuel si on revient de l'écran d'activation
  useEffect(() => {
    if (params.stoppedPlugId) {
      setActiveSessions((prev) => {
        const updated = { ...prev };
        delete updated[params.stoppedPlugId as string];
        return updated;
      });
    }
  }, [params.stoppedPlugId]);

  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('jwt_token');
      setIsMenuVisible(false);
      router.replace('/');
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: "Déconnexion impossible.", position: 'top' });
    }
  };

  if (isCheckingToken) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && dynamicStyles.darkContainer]}>
      <View style={styles.header}>
        <View style={styles.topIcons}>
          <TouchableOpacity onPress={() => setIsMenuVisible(true)}>
            <Ionicons name="menu" size={32} color="white" />
          </TouchableOpacity>
          <View style={styles.rightIcons}>
            <TouchableOpacity style={styles.iconMargin} onPress={() => router.push('/recharge')}>
              <Ionicons name="card-outline" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>Solde: {solde.toFixed(2).replace('.', ',')} €</Text>
          <TouchableOpacity style={styles.rechargeButton} onPress={() => router.push('/recharge')}>
            <Text style={styles.rechargeButtonText}>Recharger</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.scanWrapper}>
          <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/scan")}>
            <Ionicons name="qr-code-outline" size={60} color="white" />
          </TouchableOpacity>
          <Text style={styles.scanText}>Scan QR</Text>
        </View>

        {Object.values(activeSessions).length > 0 && (
          <View style={{ width: '100%', paddingHorizontal: 20, marginTop: 30 }}>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 }, isDark && dynamicStyles.darkText]}>
              🔌 Sessions en cours
            </Text>
            {Object.values(activeSessions).map((session: any) => (
              <TouchableOpacity
                key={session.plugId}
                onPress={() => router.push({ 
                  pathname: '/activation', 
                  params: { 
                    plugId: session.plugId, 
                    active: 'true', 
                    cost: session.cost, 
                    energy: session.energyWh, 
                    power: session.power || 0 
                  } 
                })}
                style={[
                  {
                    backgroundColor: 'white', padding: 15, borderRadius: 15,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: 10,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
                  }, 
                  isDark && dynamicStyles.darkCard
                ]}
              >
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#8A2BE2' }}>Prise #{session.plugId}</Text>
                  <Text style={[{ fontSize: 14, color: '#666', marginTop: 4 }, isDark && dynamicStyles.darkText]}>
                    En charge • {Number(session.energyWh).toFixed(1)} Wh • {Number(session.cost).toFixed(1)} €
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#8A2BE2" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={isMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMenuVisible(false)}
      >
        <View style={[styles.modalOverlay, isDark && dynamicStyles.darkOverlay]}>
          <View style={[styles.menuContainer, isDark && dynamicStyles.darkCard]}>
            <TouchableOpacity style={styles.menuCloseButton} onPress={() => setIsMenuVisible(false)}>
              <Ionicons name="close" size={30} color={isDark ? "white" : "#333"} />
            </TouchableOpacity>

            <Text style={[styles.menuTitle, isDark && dynamicStyles.darkText]}>Menu</Text>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); router.push('/historique'); }}>
              <Text style={[styles.menuText, isDark && dynamicStyles.darkText]}>Historique de consommation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setIsMenuVisible(false); router.push('/transactions'); }}>
              <Text style={[styles.menuText, isDark && dynamicStyles.darkText]}>Historique des transactions</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={[styles.menuText, { color: 'red' }]}>Déconnexion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const dynamicStyles = StyleSheet.create({
  darkContainer: { backgroundColor: '#121212' },
  darkCard: { backgroundColor: '#1E1E1E' },
  darkText: { color: '#FFFFFF' },
  darkOverlay: { backgroundColor: 'rgba(0, 0, 0, 0.85)' },
});