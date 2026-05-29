// Fichier : app/recharge.tsx
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';

// L'architecture stricte : on n'importe que le service
import { PaymentService } from '../services/paymentService';

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

  // Gestionnaire d'erreurs centralisé, typé et réaliste vis-à-vis d'Axios
  const handleApiError = (error: unknown, defaultMsg: string) => {
    let errorMessage = defaultMsg;
    
    if (axios.isAxiosError(error)) {
      console.log("🚨 [REJET API] :", error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        errorMessage = 'Paiement non autorisé ou session expirée.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
    } else {
      console.error("🚨 [ERREUR CRITIQUE] :", error);
    }

    Toast.show({ type: 'error', text1: 'Erreur', text2: errorMessage, position: 'top' });
  };

  const verifyStripeSession = async (sessionId: string) => {
    setProcessingType('verifying');
    setStatusMessage('Validation du paiement Stripe...');
    try {
      const data = await PaymentService.verifyStripeSession(sessionId);
      
      Toast.show({
        type: 'success',
        text1: 'Paiement réussi!',
        text2: data.message || `Solde : ${data.newBalance}€`,
        position: 'top'
      });
      router.navigate('/acceuil');
    } catch (error: unknown) {
      handleApiError(error, "Le paiement Stripe a échoué.");
      router.navigate('/recharge'); // Redirection en cas d'échec
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  /**
   * RÈGLE D'OR : Deep Linking et Vérification asynchrone au montage
   */
  useEffect(() => {
    let ignore = false;

    async function checkInitialUrl() {
      try {
        const url = await Linking.getInitialURL();
        if (!ignore && url) {
          // 1. Interception sécurisée de Stripe
          if (url.includes('stripe_session_id=')) {
            const sessionId = url.split('stripe_session_id=')[1].split('&')[0];
            if (sessionId) {
              if (!ignore) setProcessingType('verifying');
              if (!ignore) setStatusMessage('Validation du paiement Stripe...');
              
              const data = await PaymentService.verifyStripeSession(sessionId);
              if (!ignore) {
                Toast.show({ type: 'success', text1: 'Paiement réussi!', text2: data.message || `Solde : ${data.newBalance}€`, position: 'top' });
                router.navigate('/acceuil');
              }
            }
          }
          // 2. Interception sécurisée de PayPal (si Deep Link via navigateur externe)
          else if (url.includes('PayerID=') && url.includes('token=')) {
            const urlTokenMatch = url.match(/token=([^&]+)/);
            const finalOrderId = urlTokenMatch ? urlTokenMatch[1] : null;
            if (finalOrderId) {
              if (!ignore) setProcessingType('verifying');
              if (!ignore) setStatusMessage('Validation du paiement PayPal...');
              const data = await PaymentService.capturePayPalOrder(finalOrderId);
              if (!ignore) {
                Toast.show({ type: 'success', text1: 'Paiement réussi', text2: `Nouveau solde : ${data.newBalance}€`, position: 'top' });
                router.navigate('/acceuil');
              }
            }
          }
        }
      } catch (error: unknown) {
        if (!ignore) handleApiError(error, "La validation du paiement a échoué.");
      } finally {
        if (!ignore) setProcessingType(null);
        if (!ignore) setStatusMessage('');
      }
    }

    checkInitialUrl();

    const subscription = Linking.addEventListener('url', (event) => {
      const url = event.url;
      if (url && url.includes('stripe_session_id=')) {
        const sessionId = url.split('stripe_session_id=')[1].split('&')[0];
        if (sessionId) verifyStripeSession(sessionId);
      }
    });
    
    return () => {
      ignore = true;
      subscription.remove();
    };
  }, []);

  const handleStripePayment = async () => {
    setProcessingType('stripe');
    setStatusMessage('Connexion à Stripe...');
    try {
      const formattedAmount = parseFloat(selectedAmount.toString().replace(',', '.'));
      const returnUrl = Linking.createURL('recharge');

      const data = await PaymentService.createStripeSession(formattedAmount, returnUrl);

      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        throw new Error("URL de paiement Stripe manquante");
      }
    } catch (error: unknown) {
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
      const data = await PaymentService.createPayPalOrder(formattedAmount);

      if (!data.id) throw new Error("ID de commande manquant");

      setOrderId(data.id);
      
      // Règle 2 : Switch dynamique de l'environnement PayPal (Production vs Sandbox)
      const paypalBaseUrl = process.env.NODE_ENV === 'production' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com';
      setPaypalUrl(`${paypalBaseUrl}/checkoutnow?token=${data.id}`);
      console.log("message")
      console.log (process.env.NODE_ENV);
      
      setShowWebView(true);
    } catch (error: unknown) {
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
      const data = await PaymentService.capturePayPalOrder(capturedOrderId);
      Toast.show({
        type: 'success',
        text1: 'Paiement réussi',
        text2: `Nouveau solde : ${data.newBalance}€`,
        position: 'top'
      });
      router.navigate('/acceuil');
    } catch (error: unknown) {
      handleApiError(error, "Le paiement a échoué lors de la validation.");
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    // Ce gestionnaire reste en place comme fallback, mais la logique critique
    // est maintenant dans onShouldStartLoadWithRequest pour une interception plus agressive.
    // On peut par exemple logguer ici si on veut surveiller la navigation interne de PayPal.
    // console.log("[WebView Fallback] Navigation State Change:", navState.url);
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
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }}>
          {/* L'en-tête d'échappatoire */}
          <View style={{ padding: 15, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'flex-end' }}>
            <TouchableOpacity onPress={() => {
              setShowWebView(false);
              Toast.show({ type: 'info', text1: 'Paiement annulé' });
            }}>
              <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>Annuler</Text>
            </TouchableOpacity>
          </View>

          {/* Ta WebView Indestructible en dessous */}
          <WebView
            source={{ uri: paypalUrl }}
            // 1. OBLIGATOIRE : On autorise la WebView à traiter tous les types d'URL, y compris les Deep Links
            originWhitelist={['*']}

            // 👇 LES 4 LIGNES MAGIQUES 👇
            javaScriptEnabled={true}
            domStorageEnabled={true}
            sharedCookiesEnabled={true} // Obligatoire pour iOS
            thirdPartyCookiesEnabled={true} // Obligatoire pour Android
            mixedContentMode="always"
            
            // Le déguisement anti-blocage (NOUVEAU)
            userAgent="Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.153 Mobile Safari/537.36"

            // 2. INTERCEPTION AGRESSIVE : On inspecte la requête avant de la charger
            onShouldStartLoadWithRequest={(request) => {
              const { url } = request;

              console.log("[WebView Intercept] Tentative de chargement :", url);

              if (url.includes('PayerID=') && url.includes('token=')) {
                setShowWebView(false); // On ferme la modale immédiatement

                const urlTokenMatch = url.match(/token=([^&]+)/);
                const finalOrderId = urlTokenMatch ? urlTokenMatch[1] : orderId;

                if (finalOrderId && processingType !== 'verifying') {
                  captureOrder(finalOrderId);
                }

                return false; // RÈGLE CRITIQUE : On bloque le chargement de cette URL dans la WebView
              }

              if (url.includes('cancel')) {
                setShowWebView(false);
                Toast.show({ type: 'info', text1: 'Annulé', text2: 'Le paiement a été annulé.', position: 'top' });
                return false; // On bloque le chargement
              }

              // On laisse passer toutes les autres URLs (la navigation interne de PayPal)
              return true;
            }}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState={true}
            renderLoading={() => <ActivityIndicator size="large" color="#8A2BE2" style={{ flex: 1 }} />}
            style={{ flex: 1 }}
          />
        </SafeAreaView>
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
            <TouchableOpacity 
              style={[styles.paypalButton, isProcessing && { opacity: 0.5 }]} 
              onPress={handlePayPalPayment} 
              disabled={isProcessing}
            >
              {processingType === 'paypal' ? <ActivityIndicator color="white" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="logo-paypal" size={24} color="white" style={{ marginRight: 10 }} />
                  <Text style={styles.paypalButtonText}>Payer avec PayPal</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.stripeButton, isProcessing && { opacity: 0.5 }]} 
              onPress={handleStripePayment} 
              disabled={isProcessing}
            >
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

// ... Les styles restent inchangés
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