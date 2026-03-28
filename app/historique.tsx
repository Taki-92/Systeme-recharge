import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';

import api from '../services/api'; 

// On met à jour l'interface pour correspondre aux données de la route "transactions"
interface TransactionHistory {
  id: string | number;
  created_at: string;
  type: string;
  amount: string | number;
  description: string;
}

export default function HistoriqueScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchHistory = async () => {
        setIsLoading(true);
        try {
          // On appelle la route globale qui contient tout
          const response = await api.get('/api/consumption/transactions');
          
          // L'INVERSE D'AVANT : On ne garde QUE les paiements (les dépenses électriques)
          const onlyConsumptions = response.data.filter((item: any) => item.type === 'payment');
          
          setTransactions(onlyConsumptions);
        } catch (error: any) {
          console.error("[Historique] Fetch error:", error?.response?.data || error.message);
          Alert.alert("Erreur", "Impossible de charger l'historique de consommation.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchHistory();
    }, [])
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "Date inconnue";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: TransactionHistory }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        <Text style={styles.plugText}>Session de Charge</Text>
      </View>
      <View style={styles.statsRow}>
        {/* On affiche la description qui contient "Charge sur Prise3 (0.038 kWh)" */}
        <Text style={styles.descriptionText}>{item.description}</Text>
        <Text style={styles.valueText}>{item.amount} €</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Mon Historique</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune consommation trouvée</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
  backButton: { padding: 5, marginRight: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateText: { color: '#666', fontSize: 14 },
  plugText: { fontWeight: '600', color: '#8A2BE2' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, alignItems: 'center' },
  descriptionText: { flex: 1, fontSize: 14, color: '#555', marginRight: 10 },
  valueText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', fontSize: 16 },
});