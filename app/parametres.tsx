import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import api from '../services/api'; // Adapte le chemin vers ton instance Axios
import { useUserStore } from '../store/useUserStore';

export default function ParametresScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const clearStore = useUserStore((state: any) => state.clearStore);

  // ÉTATS DE CONFIRMATION DE SUPPRESSION
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  
  // 🛡️ MONTAGE SIMPLE : LA VÉRIFICATION DU TOKEN SE FERA AU CLIC
  
  useEffect(() => {
    // La route /auth/me n'existant pas sur le backend, on débloque l'UI directement.
    setIsLoading(false);
  }, []);

  
  // 📥 ACTION : EXPORT DES DONNÉES (RGPD - Portabilité)
  
    const handleExportData = async () => {
    setIsProcessingAction(true);
    // On déclare fileUri en dehors du try pour y accéder dans le finally
    const fileUri = `${FileSystem.documentDirectory}NewtonCharge_Export_RGPD.json`;
    
    try {
      const response = await api.get('/auth/export');
      const jsonString = JSON.stringify(response.data, null, 2);
      
      // Création du fichier physique sur le téléphone
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: "utf8" });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exporter mes données personnelles'
        });
        Toast.show({ type: 'success', text1: 'Export réussi', text2: 'Fichier JSON généré avec succès.', position: 'top' });
      } else {
        Toast.show({ type: 'error', text1: 'Erreur', text2: "Le partage n'est pas supporté sur cet appareil.", position: 'top' });
      }
    } catch (error) {
      console.error("Erreur d'export RGPD :", error);
    } finally {
      // 🧹  RGPD : Nettoyage du fichier temporaire pour éviter la fuite de stockage
      try {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
      } catch (cleanupError) {
        console.error("Erreur mineure lors de la suppression du fichier temp :", cleanupError);
      }
      setIsProcessingAction(false);
    }
  };


  // ACTION : SUPPRESSION DU COMPTE (RGPD - Droit à l'oubli)

  const handleDeleteAccount = async () => {
    if (!password) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Veuillez entrer votre mot de passe.', position: 'top' });
      return;
    }

    setIsProcessingAction(true);
    let apiSuccess = false;

    try {
      // On envoie le mot de passe dans le corps (data) de la requête DELETE
      await api.delete('/auth/delete', { data: { password } });
      
      apiSuccess = true;
      Toast.show({ type: 'success', text1: 'Compte supprimé', text2: 'Vos données ont été effacées.', position: 'top' });
    } catch (error: any) {
      console.error("Erreur de suppression RGPD :", error);
      const message = error.response?.data?.message || error.response?.data?.error || "Mot de passe incorrect ou erreur serveur.";
      Toast.show({ type: 'error', text1: 'Erreur', text2: message, position: 'top' });
      setIsProcessingAction(false);
    }

    // Si la suppression serveur a réussi, on procède au nettoyage local blindé
    if (apiSuccess) {
      try {
        clearStore();
        await SecureStore.deleteItemAsync('jwt_token');
      } catch (cleanupError) {
        console.warn("Avertissement: Erreur lors du nettoyage local :", cleanupError);
      } finally {
        setIsProcessingAction(false);
        router.replace('/'); 
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* EN-TÊTE STANDARD */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#8A2BE2" />
        </TouchableOpacity>
        <Text style={styles.title}>Paramètres</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Confidentialité et RGPD</Text>
          <Text style={styles.sectionDescription}>
            Gérez vos données personnelles conformément à la réglementation européenne.
          </Text>

          {/* Bouton d'export (Violet Newton) */}
          <TouchableOpacity 
            style={[styles.exportButton, isProcessingAction && { opacity: 0.6 }]} 
            onPress={handleExportData}
            disabled={isProcessingAction}
          >
            <Ionicons name="download-outline" size={24} color="white" />
            <Text style={styles.exportButtonText}>Exporter mes données (JSON)</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.dangerZoneTitle}>Zone de danger</Text>
          
          {!isConfirmingDelete ? (
            <TouchableOpacity 
              style={[styles.deleteButton, isProcessingAction && { opacity: 0.6 }]} 
              onPress={() => setIsConfirmingDelete(true)}
              disabled={isProcessingAction}
            >
              <Ionicons name="trash-outline" size={24} color="white" />
              <Text style={styles.deleteButtonText}>Supprimer mon compte</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmationContainer}>
              <Text style={styles.warningText}>
                ATTENTION : Action irréversible. Entrez votre mot de passe pour confirmer la suppression.
              </Text>
              
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Votre mot de passe"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#999"
                  editable={!isProcessingAction}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.confirmationButtons}>
                <TouchableOpacity 
                  style={[styles.cancelButton, isProcessingAction && { opacity: 0.6 }]} 
                  onPress={() => {
                    setIsConfirmingDelete(false);
                    setPassword('');
                  }}
                  disabled={isProcessingAction}
                >
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.confirmButton, isProcessingAction && { opacity: 0.6 }]} 
                  onPress={handleDeleteAccount}
                  disabled={isProcessingAction}
                >
                  {isProcessingAction ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Confirmer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 30 },
  backButton: { padding: 5, marginRight: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#8A2BE2' },
  content: { flex: 1, paddingHorizontal: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 10 },
  sectionDescription: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 20 },
  dangerZoneTitle: { fontSize: 16, fontWeight: '600', color: '#D32F2F', marginBottom: 15 },
  exportButton: { 
    backgroundColor: '#8A2BE2', 
    paddingVertical: 15,
    borderRadius: 30, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  exportButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  deleteButton: { 
    backgroundColor: '#D32F2F', 
    paddingVertical: 15, 
    borderRadius: 30, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  deleteButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  confirmationContainer: { backgroundColor: '#FFF0F0', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#FFCDD2' },
  warningText: { color: '#D32F2F', fontSize: 14, marginBottom: 15, lineHeight: 20, fontWeight: '500' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15 },
  passwordInput: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16 },
  eyeIcon: { paddingHorizontal: 15 },
  confirmationButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, backgroundColor: '#E0E0E0', paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginRight: 10 },
  cancelButtonText: { color: '#333', fontWeight: 'bold', fontSize: 15 },
  confirmButton: { flex: 1, backgroundColor: '#D32F2F', paddingVertical: 12, borderRadius: 25, alignItems: 'center', marginLeft: 10 },
  confirmButtonText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
