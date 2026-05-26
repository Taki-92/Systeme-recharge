import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';

// L'architecture propre : Services et Store
import { UserService } from '../../services/userService';
import { useNotificationStore } from '../../store/useNotificationStore';
import { UserState, useUserStore } from '../../store/useUserStore';
import { styles } from '../../styles/acceuil.styles';

const formatNotifDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AccueilScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 1. État local purement UI
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isNotifModalVisible, setIsNotifModalVisible] = useState(false);

  // 2. État global récupéré de Zustand (Synchronisé via le _layout)
  const userId = useUserStore((state: UserState) => state.userId);
  const setUserId = useUserStore((state: UserState) => state.setUserId);
  const activeSessions = useUserStore((state: UserState) => state.activeSessions);
  const clearStore = useUserStore((state: UserState) => state.clearStore);

  const solde = useUserStore((state: UserState) => state.balance);
  const setSolde = useUserStore((state: UserState) => state.setBalance);

  // 🔔 Gestion des notifications pour la cloche
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAllNotifs = useNotificationStore((state) => state.clearAll);

  const notificationsRecord = useNotificationStore((state) => state.notifications);
  const userNotifications = userId ? (notificationsRecord[userId] || []) : [];
  const unreadCount = userNotifications.filter(n => !n.isRead).length;

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

  const handleLogout = async () => {
    try {
      clearStore(); // 🧹 Purge intégrale de l'état global AVANT la suppression du token
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
            <TouchableOpacity onPress={() => {
              if (userId) markAllAsRead(userId);
              setIsNotifModalVisible(true);
            }}>
              <View>
                <Ionicons name="notifications-outline" size={28} color="white" />
                {unreadCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    right: -4,
                    top: -2,
                    backgroundColor: 'red',
                    borderRadius: 10,
                    width: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
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

      {/* MODAL NOTIFICATIONS */}
      <Modal visible={isNotifModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsNotifModalVisible(false)}>
        <View style={[styles.modalOverlay, isDark && dynamicStyles.darkOverlay]}>
          <View style={[notifStyles.modalContainer, isDark && dynamicStyles.darkCard]}>
            <View style={notifStyles.header}>
              <Text style={[notifStyles.title, isDark && dynamicStyles.darkText]}>Notifications</Text>
              {userNotifications.length > 0 && (
                <TouchableOpacity onPress={() => { if (userId) clearAllNotifs(userId); }}>
                  <Text style={{ color: '#8A2BE2', fontWeight: 'bold' }}>Tout effacer</Text>
                </TouchableOpacity>
              )}
            </View>

            {userNotifications.length === 0 ? (
              <View style={notifStyles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={50} color={isDark ? '#666' : '#ccc'} />
                <Text style={[notifStyles.emptyText, isDark && { color: '#aaa' }]}>Aucune notification pour le moment.</Text>
              </View>
            ) : (
              <FlatList
                data={userNotifications}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={[notifStyles.item, isDark && dynamicStyles.darkNotifItem]}>
                    <View style={notifStyles.itemHeader}>
                      <Text style={[notifStyles.itemTitle, isDark && dynamicStyles.darkText]} numberOfLines={1}>{item.title}</Text>
                      <Text style={notifStyles.itemDate}>{formatNotifDate(item.timestamp)}</Text>
                    </View>
                    <Text style={[notifStyles.itemMessage, isDark && { color: '#ccc' }]}>{item.message}</Text>
                  </View>
                )}
                style={{ maxHeight: 400, width: '100%' }}
              />
            )}

            <TouchableOpacity style={notifStyles.closeButton} onPress={() => setIsNotifModalVisible(false)}>
              <Text style={notifStyles.closeText}>Fermer</Text>
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
  darkNotifItem: { borderBottomColor: '#333' },
});

const notifStyles = StyleSheet.create({
  modalContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 20, fontWeight: 'bold' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: { marginTop: 15, color: '#666', textAlign: 'center' },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 10 },
  itemMessage: { fontSize: 14, color: '#555' },
  itemDate: { fontSize: 12, color: '#888' },
  closeButton: { marginTop: 15, backgroundColor: '#8A2BE2', padding: 12, borderRadius: 10, alignItems: 'center' },
  closeText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});