// Fichier : services/paymentService.ts
import api from './api';

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
    const response = await api.post<PayPalOrderResponse>('/payments/create-order', { amount });
    return response.data;
  },

  capturePayPalOrder: async (orderId: string): Promise<PaymentVerifyResponse> => {
    const response = await api.post<PaymentVerifyResponse>('/payments/capture-order', { orderId });
    return response.data;
  }
};