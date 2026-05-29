import api from './api';

export interface TransactionHistory {
  id: string | number;
  created_at: string;
  type: string;
  amount: string | number;
  description: string;
}

export const ConsumptionService = {
  /**
   * Récupère toutes les transactions et ne retourne QUE les dépenses de charge (paiements)
   */
  getConsumptions: async (): Promise<TransactionHistory[]> => {
    const response = await api.get<TransactionHistory[]>('/consumption/transactions');
    // Le filtre magique typé se fait côté service, plus de "any"
    return response.data.filter((item: TransactionHistory) => item.type === 'payment');
  }
};