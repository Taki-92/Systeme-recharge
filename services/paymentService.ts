// Fichier : services/paymentService.ts
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import api from './api';
const router = useRouter();

export interface StripeSessionResponse {
  url: string;
}

export interface PaymentVerifyResponse {
  message?: string;
  newBalance: string | number;
}

export interface PayPalOrderResponse {
  id: string;
}

export const PaymentService = {
  createStripeSession: async (amount: number, returnUrl: string): Promise<StripeSessionResponse> => {
    const response = await api.post<StripeSessionResponse>('/payments/create-stripe-session', { amount, returnUrl });
    return response.data;
  },

  verifyStripeSession: async (sessionId: string): Promise<PaymentVerifyResponse> => {
    const response = await api.post<PaymentVerifyResponse>('/payments/verify-stripe-session', { sessionId });
    return response.data;
  },

  createPayPalOrder: async (amount: number): Promise<PayPalOrderResponse> => {
    // 1. On génère dynamiquement le Deep Link vers l'écran de recharge
    const returnUrl = Linking.createURL('recharge');

    // 2. On envoie la demande au backend en injectant l'URL de retour
    const response = await api.post<PayPalOrderResponse>('/payments/create-order', { amount, returnUrl });
    return response.data;
  },

  capturePayPalOrder: async (orderId: string): Promise<PaymentVerifyResponse> => {
    const response = await api.post<PaymentVerifyResponse>('/payments/capture-order', { orderId });
    return response.data;
  }
};