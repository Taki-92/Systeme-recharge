// Fichier : app/index.tsx
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

// L'architecture propre
import { AuthService } from '../../services/authService';
import { styles } from '../../styles/index.styles';

const backgroundImage = require('../../assets/images/newton.png');

export default function LoginScreen() {
  const router = useRouter();
  
  // États UI
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // États de chargement
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  /**
   * RÈGLE D'OR : Vérification silencieuse de la session (Silent Login)
   * On regarde si un token existe au démarrage pour éviter de redemander les identifiants.
   */
  useEffect(() => {
    let ignore = false;

    async function checkExistingSession() {
      try {
        if (!ignore) setIsCheckingToken(true);
        
        const token = await SecureStore.getItemAsync('jwt_token');
        
        if (token && !ignore) {
          // Si un token existe, on redirige directement vers l'accueil
          // Note : Idéalement, on pourrait aussi faire un ping au serveur pour valider sa validité
          router.replace('/acceuil');
        } else if (!ignore) {
          setIsCheckingToken(false);
        }
      } catch (error: unknown) {
        if (!ignore) {
          console.error("Erreur lors de la lecture du token:", error);
          setIsCheckingToken(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      ignore = true; // Protection absolue contre les memory leaks
    };
  }, []); // <-- Tableau vide, la vérification ne tourne qu'UNE seule fois au montage

  const handleLogin = async () => {
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Toast.show({ type: 'error', text1: 'Email invalide', text2: 'Veuillez entrer une adresse email valide.' });
      return;
    }

    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Erreur', text2: 'Veuillez remplir tous les champs', position: 'top' });
      return;
    }

    const deviceId = "mobile-app-etu-01";
    setIsLoggingIn(true);

    try {
      // 1. Appel via la couche Service
      const data = await AuthService.login(email, password, deviceId);

      // 2. Stockage sécurisé
      await SecureStore.setItemAsync('jwt_token', data.token);

      Toast.show({ type: 'success', text1: 'Connexion réussie', text2: 'Bienvenue !', position: 'top' });
      
      // 3. Redirection
      router.replace('/acceuil');

    } catch (error: unknown) {
      // Éradication du (error: any) : On vérifie si c'est une erreur Axios
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.response?.data?.error || "Identifiants invalides.";        
        Toast.show({ type: 'error', text1: 'Erreur de connexion', text2: message, position: 'top' });
        console.error("Erreur Serveur:", error.response?.data);
      } else {
        Toast.show({ type: 'error', text1: 'Erreur', text2: 'Impossible de contacter le serveur.', position: 'top' });
        console.error("Erreur inattendue:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // On affiche un loader pendant qu'on fouille dans le SecureStore
  if (isCheckingToken) {
    return (
      <View style={[styles.overlay, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.background} resizeMode="cover">
      <View style={styles.overlay}>
        
        <Text style={styles.title}>Portail Étudiant</Text>
        <Text style={styles.subtitle}>Système de Recharge Newton</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="mehdi@cielnewton.fr"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#ccc" 
            editable={!isLoggingIn}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mot de passe</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="********"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#ccc"
              editable={!isLoggingIn}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="gray" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, isLoggingIn && { opacity: 0.7 }]} 
          onPress={handleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Se connecter</Text>
          )}
        </TouchableOpacity>

      </View>
    </ImageBackground>
  );
}