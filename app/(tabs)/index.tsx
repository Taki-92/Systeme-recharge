import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { ImageBackground, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

// On utilise NOTRE voiture (l'instance API centralisée)
import api from '../../services/api';
import { styles } from '../../styles/index.styles';

const backgroundImage = require('../../assets/images/newton.png');

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    console.log("Le bouton a été cliqué ! Email :", email); 
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Veuillez remplir tous les champs',
        position: 'top' // Adapté au nouveau design
      });
      return;
    }

    const deviceId = "mobile-app-etu-01";

    try {
      // Plus besoin de process.env ici, l'instance 'api' connaît déjà l'adresse !
      const response = await api.post('/api/auth/login', {
        email: email.trim(),
        password: password,
        deviceId: deviceId,
      });

      const { token } = response.data;
      console.log("Connexion réussie, Token:", token);

      // Stocker le token de manière sécurisée (l'assistant api le lira aux prochains appels)
      await SecureStore.setItemAsync('jwt_token', token);

      // Afficher le toast de succès
      Toast.show({
        type: 'success',
        text1: 'Connexion réussie',
        text2: 'Bienvenue ! ',
        position: 'top' // Adapté au nouveau design
      });

      // Rediriger vers l'écran d'accueil après un court délai
      router.replace('/acceuil');

    } catch (error: any) {
      // On gère l'erreur sans la dépendance directe à Axios
      if (error?.response) {
        // L'erreur vient de l'API (ex: 401, 404, 500)
        const message = error.response?.data?.message || error.response?.data?.error || "Identifiants invalides ou erreur serveur.";        
        Toast.show({
          type: 'error',
          text1: 'Erreur de connexion',
          text2: message,
          position: 'top'
        });
        console.error("Erreur Serveur:", error.response?.data);

      } else {
        // Erreur réseau ou autre (le serveur n'est pas joignable)
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Impossible de contacter le serveur. Vérifiez votre connexion internet.',
          position: 'top'
        });
        console.error("Détail technique de l'erreur:", error.message);
      }
    }
  };

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
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="gray" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Se connecter</Text>
        </TouchableOpacity>

    </View>
    </ImageBackground>
  );
}