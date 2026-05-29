// Fichier : services/transactionService.ts
import api from './api';

// On centralise l'interface ici pour pouvoir l'importer partout
export interface Transaction {
  id: string | number;
  created_at: string;
  type: string;
  amount: string | number;
  description: string;
}

export const TransactionService = {
  /**
   * Récupère toutes les transactions et ne retourne QUE les rechargements
   */
  getTopUps: async (): Promise<Transaction[]> => {
    // Le service encapsule l'URL exacte
    const response = await api.get<Transaction[]>('/consumption/transactions');
    
    // Le filtrage métier se fait ici, pas dans le composant UI
    return response.data.filter((item: Transaction) => item.type === 'recharge');
  }
};