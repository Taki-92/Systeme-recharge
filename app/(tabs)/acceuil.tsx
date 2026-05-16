import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';

// L'architecture propre : Services et Store
import { UserService } from '../../services/userService';
import { UserState, useUserStore } from '../../store/useUserStore';
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 1. État local purement UI
  const [solde, setSolde] = useState(0);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // 2. État global récupéré de Zustand (Synchronisé via le _layout)
  const userId = useUserStore((state: UserState) => state.userId);
  const setUserId = useUserStore((state: UserState) => state.setUserId);
  const activeSessions = useUserStore((state: UserState) => state.activeSessions);

  /**
   * RÈGLE D'OR : Récupération du profil et du solde
   */
  useFocusEffect(
    useCallback(() => {
      let ignore = false; // Initialisation de la règle d'or

      async function loadProfile() {
        try {
          if (!ignore) setIsCheckingToken(true);
          
          const profile = await UserService.getProfile();
          
          if (!ignore) {
            setUserId(profile.id);
            setSolde(parseFloat(profile.balance.toString()));
          }
        } catch (error: unknown) {
          if (!ignore) {
            console.error("[Accueil] Erreur Profile:", error);
            // NB: La gestion du 401 (nettoyage SecureStore) est désormais gérée 
            // de manière invisible par ton intercepteur api.ts !
          }
        } finally {
          if (!ignore) setIsCheckingToken(false);
        }
      }

      loadProfile();

      return () => {
        ignore = true; // Nettoyage absolu pour éviter les Memory Leaks
      };
    }, [setUserId])
  );

  /**
   * RÈGLE D'OR : Gestion des Notifications Push
   */
  useEffect(() => {
    if (!userId) return;
    let ignore = false; // Initialisation de la règle d'or

    async function registerForPushNotificationsAsync() {
      try {
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

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const expoPushToken = tokenData.data;

        if (!ignore && expoPushToken) {
          await UserService.registerPushToken(expoPushToken);
        }
      } catch (error: unknown) {
        if (!ignore) {
          console.error("🚨 Erreur Push Token:", error);
        }
      }
    }

    registerForPushNotificationsAsync();

    return () => {
      ignore = true; // Nettoyage absolu
    };
  }, [userId]);

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
      {/* HEADER */}
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

      {/* BODY */}
      <View style={styles.body}>
        <View style={styles.scanWrapper}>
          <TouchableOpacity style={styles.scanButton} onPress={() => router.push("/scan")}>
            <Ionicons name="qr-code-outline" size={60} color="white" />
          </TouchableOpacity>
          <Text style={styles.scanText}>Scan QR</Text>
        </View>

        {/* AFFICHAGE DES SESSIONS VIA ZUSTAND (Temps Réel) */}
        {Object.keys(activeSessions).length > 0 && (
          <View style={{ width: '100%', paddingHorizontal: 20, marginTop: 30 }}>
            <Text style={[{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 }, isDark && dynamicStyles.darkText]}>
              🔌 Sessions en cours
            </Text>
            {Object.entries(activeSessions).map(([plugId, session]: [string, any]) => (
              <TouchableOpacity
                key={plugId}
                onPress={() => router.push({ 
                  pathname: '/activation', 
                  params: { 
                    plugId: plugId, 
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
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#8A2BE2' }}>Prise #{plugId}</Text>
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

      {/* MODAL MENU */}
      <Modal visible={isMenuVisible} transparent={true} animationType="fade" onRequestClose={() => setIsMenuVisible(false)}>
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