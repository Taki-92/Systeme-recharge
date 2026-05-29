import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Toast from 'react-native-toast-message';

// Architecture : Services, Store et Styles
import { SessionService } from '../services/SessionService';
import { UserService } from '../services/userService';
import { UserState, useUserStore } from '../store/useUserStore';
import { styles } from '../styles/activation.styles';

export default function ActivationScreen() {
  const router = useRouter();
  const { plugId, cost, energy, power: initialPower } = useLocalSearchParams<{ plugId: string, cost: string, energy: string, power: string }>();

  // Store Zustand global
  const userId = useUserStore((state: UserState) => state.userId);
  const setUserId = useUserStore((state: UserState) => state.setUserId);
  const activeSessions = useUserStore((state: UserState) => state.activeSessions);
  const currentSession = activeSessions[plugId]; // Récupère la session active pour cette prise
  const addSession = useUserStore((state: UserState) => state.addSession);
  const removeSession = useUserStore((state: UserState) => state.removeSession);

  // État local déduit du Store
  const isCharging = !!currentSession;

  // States UI & Live Data
  const [isLoading, setIsLoading] = useState(false);
  // Les données live sont désormais dérivées de Zustand pour une source de vérité unique
  const liveCost = currentSession?.cost ? Number(currentSession.cost).toFixed(2) : '0.00';
  const liveEnergy = currentSession?.energyWh ? Number(currentSession.energyWh).toFixed(1) : '0';
  const power = currentSession?.power ? String(currentSession.power) : '0';
  const voltage = currentSession?.voltage ? String(currentSession.voltage) : '0';
  const [isAdminStopModalVisible, setIsAdminStopModalVisible] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  /**
   * RÈGLE D'OR 1 : Initialisation du profil utilisateur
   */
  useEffect(() => {
    let ignore = false;
    
    async function initUser() {
      try {
        const profile = await UserService.getProfile();
        if (!ignore && profile?.id) {
          setUserId(profile.id);
        }
      } catch (e) {
        if (!ignore) {
          console.error("[Activation] Erreur profil:", e);
        }
      }
    }
    
    if (!userId) initUser();
    
    return () => { ignore = true; };
  }, [setUserId]); // <-- Loi 3 : Tableau verrouillé pour interdire la boucle

  /**
   * RÈGLE D'OR 2 : Vérification du statut de la borne (Prévention amnésie)
   */
  useEffect(() => {
    let ignore = false;
    
    async function checkStatus() {
      try {
        const statusData = await SessionService.getPlugStatus(plugId);
        if (!ignore && statusData?.isActive) {
          addSession(plugId, statusData.sessionDetails || {});
        }
      } catch (e: any) {
        if (!ignore && e.response?.status !== 404) {
          console.warn("[Activation] Statut borne indisponible");
        }
      }
    }
    
    checkStatus();
    
    return () => { ignore = true; };
  }, [plugId, addSession]);

  // Gestion des erreurs centralisée
  const handleError = (error: any, defaultMessage: string) => {
    let errorMessage = defaultMessage;
    if (axios.isAxiosError(error) && error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    Toast.show({ type: 'error', text1: 'Erreur', text2: errorMessage });
  };

  /**
   * LOGIQUE MÉTIER : Démarrer la charge
   */
  const startCharging = async () => {
    setIsLoading(true);
    try {
      await SessionService.startCharging(plugId);
      addSession(plugId, { startTime: Date.now() });
      // Le composant va se re-render et afficher les valeurs par défaut de la session
    } catch (error) {
      handleError(error, "Impossible d'activer la prise.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * LOGIQUE MÉTIER : Arrêter la charge
   */
  const stopCharging = async () => {
    setIsLoading(true);
    try {
      const data = await SessionService.stopCharging(plugId);

      const rawCost = data?.cost || "0";
      const rawBalance = data?.newBalance || "0";

      const finalCost = parseFloat(String(rawCost).replace('€', '').trim()) || 0;
      const finalBalance = parseFloat(String(rawBalance).replace('€', '').trim()) || 0;

      Alert.alert(
        "Charge terminée",
        `Coût : ${finalCost.toFixed(2)} €\nNouveau solde : ${finalBalance.toFixed(2)} €`,
        [{ text: "OK", onPress: () => router.replace('/acceuil') }]
      );
    } catch (error: any) {
      console.log("Le serveur a renvoyé une erreur, mais on nettoie quand même l'UI", error);
      
      if (error.response?.status === 400 || error.response?.status === 404) {
        router.replace('/acceuil');
      } else {
        handleError(error, "Erreur lors de l'arrêt.");
      }
    } finally {
      // QUOI QU'IL ARRIVE (Succès ou Erreur), on supprime la prise de l'écran
      removeSession(plugId);
      setIsLoading(false);
    }
  };

  /**
   * NAVIGATION SÉCURISÉE : Fermer l'écran sans relancer le scanner
   */
  const handleClose = () => {
    router.replace('/acceuil'); 
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{isCharging ? "Charge en cours" : "Borne détectée"}</Text>
        <Text style={styles.plugId}>#{plugId}</Text>

        {/* Bouton de fermeture sécurisé avec hitSlop élargi */}
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={handleClose}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        >
          <Ionicons name="close-circle" size={35} color={isDark ? "white" : "#333"} />
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#8A2BE2" />
            <Text style={styles.loaderText}>Communication en cours...</Text>
          </View>
        ) : isCharging ? (
          <View style={{ width: '100%', alignItems: 'center', gap: 15 }}>
            <Ionicons name="flash" size={60} color="#4CAF50" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>Charge active</Text>

            <View style={dashboardStyle.statsGrid}>
               <StatItem label="Coût" value={`${Number(liveCost).toFixed(2)} €`} icon="cash-outline" />
               <StatItem label="Énergie" value={`${Number(liveEnergy).toFixed(1)} Wh`} icon="battery-charging-outline" />
               <StatItem label="Puissance" value={`${power} W`} icon="flash-outline" color="#e67e22" />
               <StatItem label="Tension" value={`${voltage} V`} icon="speedometer-outline" color="#3498db" />
            </View>

            <TouchableOpacity 
              style={[styles.activateButton, { backgroundColor: '#D32F2F', width: '100%' }]} 
              onPress={stopCharging}
              disabled={isLoading}
            >
              <Text style={styles.activateButtonText}>Clôturer la session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            <View style={styles.infoContainer}>
              <Text style={styles.description}>Voulez-vous activer cette borne ?</Text>
            </View>
            <TouchableOpacity 
              style={styles.activateButton} 
              onPress={startCharging}
              disabled={isLoading}
            >
              <Text style={styles.activateButtonText}>Démarrer la charge</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// Sous-composant UI
function StatItem({ label, value, icon, color = "#8A2BE2" }: any) {
  return (
    <View style={{ alignItems: 'center', width: '45%', marginVertical: 10 }}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#333' }}>{value}</Text>
    </View>
  );
}

// Styles internes ajoutés
const dashboardStyle = StyleSheet.create({
  statsGrid: { 
    width: '100%', 
    backgroundColor: '#F5F7FA', 
    borderRadius: 12, 
    padding: 10, 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-around' 
  }
});