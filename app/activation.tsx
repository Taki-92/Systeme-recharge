import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { io, Socket } from 'socket.io-client';

import api from '../services/api';
import { styles } from '../styles/activation.styles';

interface UserProfile {
  id: string;
}

interface LiveConsumptionData {
  userId: string | number;
  plugId: string | number;
  cost?: number;
  energyWh?: number;
  reason?: string;
}

interface PowerUpdateData {
  plugId: string | number;
  power?: number;
}

interface VoltageUpdateData {
  plugId: string | number;
  voltage?: number;
}

export default function ActivationScreen() {
  const router = useRouter();
  const { plugId, active, cost, energy, power: initialPower } = useLocalSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isCharging, setIsCharging] = useState(active === 'true');
  const [userId, setUserId] = useState<string | null>(null);
  const [liveCost, setLiveCost] = useState(cost ? String(cost) : '0.00');
  const [liveEnergy, setLiveEnergy] = useState(energy ? String(energy) : '0');
  const [power, setPower] = useState(initialPower ? String(initialPower) : '0');
  const [voltage, setVoltage] = useState('0');
  
  const [isAdminStopModalVisible, setIsAdminStopModalVisible] = useState(false);
  const [stopReason, setStopReason] = useState<string>('stop');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const initUser = async () => {
      try {
        const response = await api.get<UserProfile>('/api/auth/profile');
        const id = response.data?.id;
        if (id) {
          setUserId(id);
        } else {
          throw new Error("ID utilisateur non trouvé");
        }
      } catch (e) {
        console.error("[Activation] Erreur critique profil:", e);
        Alert.alert(
          "Erreur d'authentification",
          "Impossible de vérifier votre identité. Veuillez réessayer.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    };
    initUser();
  }, [router]);

  useEffect(() => {
    if (!userId || !isCharging) return;

    const baseURL = process.env.EXPO_PUBLIC_API_URL || 'https://recharge.cielnewton.fr';
    const socket: Socket = io(baseURL, {
      path: "/api/socket.io",
      transports: ['websocket']
    });

    socket.on('live_consumption', (data: LiveConsumptionData) => {
      if (String(data.userId) === String(userId) && String(data.plugId) === String(plugId)) {
        if (data.cost !== undefined) setLiveCost(String(data.cost));
        if (data.energyWh !== undefined) setLiveEnergy(String(data.energyWh));
      }
    });

    socket.on('power_update', (data: PowerUpdateData) => {
      if (String(data.plugId) === String(plugId) && data.power !== undefined) {
        setPower(String(data.power));
      }
    });

    socket.on('voltage_update', (data: VoltageUpdateData) => {
      if (String(data.plugId) === String(plugId) && data.voltage !== undefined) {
        setVoltage(String(data.voltage));
      }
    });

    socket.on('session_auto_stopped', (data: LiveConsumptionData) => {
      if (String(data.userId) === String(userId) && String(data.plugId) === String(plugId)) {
        setIsCharging(false);
        setStopReason(data.reason || 'stop');
        setIsAdminStopModalVisible(true);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, isCharging, plugId, router]);

  const handleError = (error: any, defaultMessage: string) => {
    let errorMessage = defaultMessage;
    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    }

    if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('solde insuffisant')) {
      Alert.alert(
        "Solde Insuffisant",
        "Votre solde est inférieur à 1€. Voulez-vous recharger votre compte maintenant ?",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Recharger", onPress: () => router.push('/recharge'), style: "default" }
        ]
      );
    } else {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: errorMessage,
      });
    }
  };

  const startCharging = async () => {
    setIsLoading(true);
    try {
      await api.post('/api/plugs/start', { plugId });
      setIsCharging(true);
      setLiveCost('0.00');
      setLiveEnergy('0');
      setPower('0');
      setVoltage('0');
    } catch (error) {
      handleError(error, "Impossible d'activer la prise.");
    } finally {
      setIsLoading(false);
    }
  };

  const stopCharging = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/plugs/stop', { plugId });
      
      console.log("✅ Réponse serveur Stop:", response.data);

      // On récupère les valeurs brutes envoyées par le serveur ("0.0296€")
      const rawCost = response.data?.cost || "0";
      const rawBalance = response.data?.newBalance || "0";

      // On retire le "€", les espaces, et on transforme en nombre décimal
      const finalCost = parseFloat(String(rawCost).replace('€', '').trim());
      const finalBalance = parseFloat(String(rawBalance).replace('€', '').trim());

      setIsCharging(false);
      Alert.alert(
        "Charge terminée",
        `Coût : ${finalCost.toFixed(2)} €\nNouveau solde : ${finalBalance.toFixed(2)} €`,
        [{ 
          text: "OK", 
          onPress: () => router.navigate({ pathname: '/acceuil', params: { stoppedPlugId: plugId } }) 
        }]
      );
    } catch (error: any) {
      console.error("🚨 Erreur lors du Stop:", error?.response?.data || error.message);
      
      if (error?.response?.status === 400 || error?.response?.status === 404) {
          setIsCharging(false);
        router.navigate({ pathname: '/acceuil', params: { stoppedPlugId: plugId } });
      } else {
          handleError(error, "Impossible d'arrêter la charge.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{isCharging ? "Charge en cours" : "Borne détectée"}</Text>
        <Text style={styles.plugId}>#{plugId}</Text>

        <TouchableOpacity style={styles.closeButton} onPress={() => router.navigate('/acceuil')}>
          <Ionicons name="close" size={32} color="white" />
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

            <View style={{ width: '100%', backgroundColor: '#F5F7FA', borderRadius: 12, padding: 15, marginVertical: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 }}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="cash-outline" size={24} color="#8A2BE2" />
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>Coût</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{Number(liveCost).toFixed(2)} €</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="battery-charging-outline" size={24} color="#8A2BE2" />
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>Énergie</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{Number(liveEnergy).toFixed(1)} Wh</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="flash-outline" size={24} color="#e67e22" />
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>Puissance</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{power} W</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="speedometer-outline" size={24} color="#3498db" />
                  <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>Tension</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>{voltage} V</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={[styles.activateButton, { backgroundColor: '#D32F2F', width: '100%' }]} onPress={stopCharging}>
              <Text style={styles.activateButtonText}>Clôturer la session</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            <View style={styles.infoContainer}>
              <Text style={styles.description}>Voulez-vous activer cette borne ?</Text>
            </View>
            <TouchableOpacity style={styles.activateButton} onPress={startCharging}>
              <Text style={styles.activateButtonText}>Démarrer la charge</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modal Personnalisé pour la clôture admin */}
      <Modal visible={isAdminStopModalVisible} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.content, isDark && modalStyles.darkContent]}>
            <Ionicons name="information-circle-outline" size={50} color="#8A2BE2" />
            <Text style={[modalStyles.title, isDark && modalStyles.darkText]}>
              {stopReason === 'maintenance' ? "Borne en Maintenance" : "Session terminée"}
            </Text>
            <Text style={[modalStyles.message, isDark && modalStyles.darkTextSecondary]}>
              {stopReason === 'maintenance' 
                ? "Cette prise vient d'être placée en maintenance par nos équipes. Votre session a été interrompue en toute sécurité." 
                : "La session de charge a été clôturée par un administrateur."}
            </Text>
            <TouchableOpacity 
              style={modalStyles.button} 
              onPress={() => {
                setIsAdminStopModalVisible(false);
                router.navigate({ pathname: '/acceuil', params: { stoppedPlugId: plugId } });
              }}
            >
              <Text style={modalStyles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { backgroundColor: 'white', borderRadius: 20, padding: 25, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  darkContent: { backgroundColor: '#1E1E1E' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', marginTop: 15, marginBottom: 10 },
  message: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25 },
  darkText: { color: '#FFFFFF' },
  darkTextSecondary: { color: '#AAAAAA' },
  button: { backgroundColor: '#8A2BE2', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});