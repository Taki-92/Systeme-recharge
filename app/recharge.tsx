import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// On utilise uniquement ton instance centralisée
import api from '../services/api';

import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';

export default function RechargeScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [processingType, setProcessingType] = useState<'stripe' | 'paypal' | 'verifying' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [showWebView, setShowWebView] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paypalUrl, setPaypalUrl] = useState('');

  const amounts = [5, 10, 20];

  const isProcessing = processingType !== null;

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      if (url.includes('stripe_session_id=')) {
        const sessionId = url.split('stripe_session_id=')[1].split('&')[0];
        if (sessionId) {
          verifyStripeSession(sessionId);
        }
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    
    return () => subscription.remove();
  }, []);

  // Helper pour centraliser la gestion des erreurs (SANS avoir besoin d'importer Axios)
  const handleApiError = (error: any, defaultMsg: string) => {
    console.log("🚨 [REJET API] :", error?.response?.data || error.message);
    
    // Si c'est une erreur réseau classique avec une réponse du serveur
    if (error?.response?.data?.error) {
      Toast.show({ type: 'error', text1: 'Erreur de paiement', text2: error.response.data.error, position: 'top' });
    } else {
      // Si c'est une erreur inattendue (ex: perte de connexion)
      Toast.show({ type: 'error', text1: 'Erreur', text2: defaultMsg, position: 'top' });
    }
  };

  const verifyStripeSession = async (sessionId: string) => {
    setProcessingType('verifying');
    setStatusMessage('Validation du paiement Stripe...');
    try {
      const response = await api.post('/api/payments/verify-stripe-session', { sessionId });
      
      if (response.status == 200) {
        Toast.show({
          type: 'success',
          text1: 'Paiement réussi!',
          text2: response.data.message || `Solde : ${response.data.newBalance}€`,
          position: 'top'
        });
        router.navigate('/acceuil');
      } else if (response.status == 401) {
        Toast.show({
          type: 'error',
          text1: 'Paiement échoué!',
          text2: 'Réessayez plus tard.',
          position: 'top'
        });
        router.navigate('/recharge')
      }

    } catch (error: any) {
      handleApiError(error, "Le paiement Stripe a échoué.");
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  const handleStripePayment = async () => {
    setProcessingType('stripe');
    setStatusMessage('Connexion à Stripe...');
    try {
      const formattedAmount = parseFloat(selectedAmount.toString().replace(',', '.'));
      const returnUrl = Linking.createURL('recharge');

      const response = await api.post('/api/payments/create-stripe-session', { 
        amount: formattedAmount, 
        returnUrl: returnUrl 
      });

      if (response.data?.url) {
        await Linking.openURL(response.data.url);
      } else {
        throw new Error("URL de paiement Stripe manquante");
      }
    } catch (error: any) {
      handleApiError(error, "Impossible d'initialiser Stripe.");
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  const handlePayPalPayment = async () => {
    setProcessingType('paypal');
    setStatusMessage('Initialisation PayPal...');
    try {
      const formattedAmount = parseFloat(selectedAmount.toString().replace(',', '.'));
      const createResponse = await api.post('/api/payments/create-order', { amount: formattedAmount });

      const generatedOrderId = createResponse.data.id;
      if (!generatedOrderId) throw new Error("ID de commande manquant");

      setOrderId(generatedOrderId);
      setPaypalUrl(`https://www.sandbox.paypal.com/checkoutnow?token=${generatedOrderId}`);
      setShowWebView(true);
    } catch (error: any) {
      handleApiError(error, "Impossible d'initialiser le paiement.");
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  const captureOrder = async (capturedOrderId: string) => {
    setProcessingType('verifying');
    setStatusMessage('Validation du paiement...');
    try {
      const captureResponse = await api.post('/api/payments/capture-order', { orderId: capturedOrderId });
      Toast.show({
        type: 'success',
        text1: 'Paiement réussi',
        text2: `Nouveau solde : ${captureResponse.data.newBalance}€`,
        position: 'top'
      });
      router.navigate('/acceuil');
    } catch (error: any) {
      handleApiError(error, "Le paiement a échoué lors de la validation.");
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    if (url.includes('return') || url.includes('success')) {
      setShowWebView(false);
      if (orderId) captureOrder(orderId);
    } else if (url.includes('cancel')) {
      setShowWebView(false);
      Toast.show({ type: 'info', text1: 'Annulé', text2: 'Le paiement a été annulé.', position: 'top' });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => showWebView ? setShowWebView(false) : router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#8A2BE2" />
        </TouchableOpacity>
        <Text style={styles.title}>Recharger mon compte</Text>
      </View>

      {showWebView ? (
        <WebView
          source={{ uri: paypalUrl }}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={true}
          renderLoading={() => <ActivityIndicator size="large" color="#8A2BE2" style={{ flex: 1 }} />}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Choisir un montant</Text>
          <View style={styles.cardsContainer}>
            {amounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[styles.amountCard, selectedAmount === amount && styles.selectedCard]}
                onPress={() => setSelectedAmount(amount)}
              >
                <Text style={[styles.amountText, selectedAmount === amount && styles.selectedText]}>{amount} €</Text>
              </TouchableOpacity>
            ))}
          </View>

          {statusMessage ? <Text style={styles.statusText}>{statusMessage}</Text> : null}
          <View style={{ flex: 1 }} />

          <View style={styles.paymentButtonsContainer}>
            <TouchableOpacity style={styles.paypalButton} onPress={handlePayPalPayment} disabled={isProcessing}>
              {processingType === 'paypal' ? <ActivityIndicator color="white" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="logo-paypal" size={24} color="white" style={{ marginRight: 10 }} />
                  <Text style={styles.paypalButtonText}>Payer avec PayPal</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.stripeButton} onPress={handleStripePayment} disabled={isProcessing}>
              {processingType === 'stripe' ? <ActivityIndicator color="white" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="card" size={24} color="white" style={{ marginRight: 10 }} />
                  <Text style={styles.stripeButtonText}>Payer par Carte Bancaire</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 30 },
  backButton: { padding: 5, marginRight: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#8A2BE2' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 20 },
  cardsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  amountCard: { width: '30%', backgroundColor: 'white', paddingVertical: 20, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 2, borderColor: 'transparent' },
  selectedCard: { borderColor: '#8A2BE2', backgroundColor: '#F3E5F5' },
  amountText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  selectedText: { color: '#8A2BE2' },
  statusText: { textAlign: 'center', color: '#666', marginTop: 10, fontStyle: 'italic' },
  paymentButtonsContainer: { gap: 15 },
  paypalButton: { backgroundColor: '#0070ba', borderRadius: 30, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  paypalButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  stripeButton: { backgroundColor: '#1A1A1A', borderRadius: 30, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  stripeButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});