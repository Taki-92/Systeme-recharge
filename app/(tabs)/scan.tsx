import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { styles } from '../../styles/scan.styles';

export default function ScanScreen() {
  // Gestion de la permission d'utiliser l'appareil photo
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  // Réinitialise le scanner à chaque fois que l'écran est affiché
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
    }, [])
  );

  // Si l'état de la permission charge encore
  if (!permission) {
    return <View style={styles.container} />;
  }

  // Si l'utilisateur n'a pas encore donné l'autorisation
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Nous avons besoin de votre permission pour utiliser la caméra.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Autoriser la caméra</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Fonction appelée quand un QR code est détecté
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true); // Empêche de scanner 100 fois par seconde
     // Redirection directe vers l'écran d'activation, la validation est déléguée au backend
    router.push({ pathname: '/activation', params: { plugId: data } });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"], // On cherche uniquement des QR codes
        }}
      />

      {/* Croix pour fermer et revenir à l'accueil */}
      <TouchableOpacity style={styles.closeButton} onPress={() => router.navigate('/acceuil')}>
        <Ionicons name="close" size={32} color="white" />
      </TouchableOpacity>

      {/* Design de la zone de scan (Voile noir + Carré transparent) */}
      <View style={styles.overlay}>
        <View style={styles.unfocusedContainer} />
        <View style={styles.middleContainer}>
          <View style={styles.unfocusedContainer} />
          
          {/* Le carré central du Viseur */}
          <View style={styles.focusedContainer}>
            {/* La ligne bleue style "Laser" */}
            <View style={styles.laserLine} />
          </View>

          <View style={styles.unfocusedContainer} />
        </View>
        <View style={styles.unfocusedContainer}>
          <Text style={styles.scanText}>Scanner le code</Text>
        </View>
      </View>
    </View>
  );
}