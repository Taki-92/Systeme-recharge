// Fichier : app/recharge.tsx
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';

// L'architecture stricte : on n'importe que le service
import { PaymentService } from '../services/paymentService';

export default function RechargeScreen() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [processingType, setProcessingType] = useState<'stripe' | 'paypal' | 'verifying' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [orderId, setOrderId] = useState<string | null>(null);

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

  /**
   * Deep Linking et Vérification asynchrone stricte au montage
   */
  useEffect(() => {
    // 1 : DÉCLARATION STRICTE DE LA VARIABLE D'IGNORANCE
    let ignore = false;

    // 2. FONCTION ASYNCHRONE INTERNE AVEC TRY/CATCH
    async function handlePaymentReturn(url: string | null) {
      if (!url) return;

      // --- GESTION DE STRIPE ---
      if (url.includes('stripe_session_id=')) {
        const sessionId = url.split('stripe_session_id=')[1].split('&')[0];
        if (!sessionId) return;

        try {
          if (!ignore) {
            setProcessingType('verifying');
            setStatusMessage('Validation du paiement Stripe...');
          }
          
          const data = await PaymentService.verifyStripeSession(sessionId);
          
          if (!ignore) {
            setProcessingType(null);
            setStatusMessage('');
            Toast.show({ type: 'success', text1: 'Paiement réussi!', text2: data.message || `Solde : ${data.newBalance}€`, position: 'top' });
            router.navigate('/acceuil');
          }
        } catch (err: unknown) {
          if (!ignore) {
            setProcessingType(null);
            setStatusMessage('');
            handleApiError(err, "Le paiement Stripe a échoué.");
            router.navigate('/recharge');
          }
        }
        return;
      }

      // --- GESTION DE PAYPAL ---
      if (url.includes('PayerID=') && url.includes('token=')) {
        const urlTokenMatch = url.match(/token=([^&]+)/);
        const finalOrderId = urlTokenMatch ? urlTokenMatch[1] : null;

        if (!finalOrderId) return;

        try {
          if (!ignore) {
            setProcessingType('verifying');
            setStatusMessage('Validation du paiement PayPal...');
          }
          
          // 3. APPEL DU SERVICE (qui gère Axios de manière centralisée)
          const data = await PaymentService.capturePayPalOrder(finalOrderId);

          // 4. MISE À JOUR DU STATE UNIQUEMENT SI !ignore
          if (!ignore) {
            setProcessingType(null);
            setStatusMessage('');
            Toast.show({ type: 'success', text1: 'Paiement validé', text2: `Votre compte a été rechargé. Nouveau solde : ${data.newBalance}€`, position: 'top' });
            router.navigate('/acceuil');
          }
        } catch (err: unknown) {
          // 4. MISE À JOUR DU STATE POUR L'ERREUR UNIQUEMENT SI !ignore
          if (!ignore) {
            setProcessingType(null);
            setStatusMessage('');
            handleApiError(err, "La capture PayPal a échoué.");
          }
        }
      }
    }

    // Interception A : L'application était complètement fermée (Cold Start)
    async function checkInitialUrl() {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) await handlePaymentReturn(initialUrl);
      } catch (err) {
        console.error("Erreur lors de la récupération de l'URL initiale", err);
      }
    }
    
    checkInitialUrl();

    // Interception B : L'application était en arrière-plan (Background)
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handlePaymentReturn(url);
    });

    // 5. FONCTION DE NETTOYAGE OBLIGATOIRE
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
      const checkoutUrl = `${paypalBaseUrl}/checkoutnow?token=${data.id}&locale.x=fr_FR`;
      
      // Le navigateur natif va gérer la sécurité et les cookies de manière transparente
      await Linking.openURL(checkoutUrl);
    } catch (error: unknown) {
      handleApiError(error, "Impossible d'initialiser le paiement.");
    } finally {
      setProcessingType(null);
      setStatusMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#8A2BE2" />
        </TouchableOpacity>
        <Text style={styles.title}>Recharger mon compte</Text>
      </View>

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