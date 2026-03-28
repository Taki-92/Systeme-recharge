import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// On utilise ton instance API configurée
import api from '../services/api';

export default function TransactionsScreen() {
  const router = useRouter();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchTransactions = async () => {
        setIsLoading(true);
        try {
          // L'appel API via ton instance (qui gère déjà le token et la baseURL)
          const responseTrans = await api.get('/api/consumption/transactions');
          
          // LE FILTRE MAGIQUE EST ICI :
          // On ne garde que les transactions d'ajout de fonds (Stripe/PayPal)
          const onlyTopUps = responseTrans.data.filter((item: any) => item.type === 'recharge');
          
          setTransactions(onlyTopUps);
        } catch (error) {
          console.error("Erreur lors du chargement des transactions :", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchTransactions();
    }, [])
  );

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const amountValue = parseFloat(item.amount);

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          {/* Comme on a filtré, ce sera toujours un rechargement */}
          <Text style={[styles.typeText, { color: '#4CAF50' }]}>
            Rechargement
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.infoText}>{item.description}</Text>
          <Text style={[styles.valueText, { color: '#4CAF50' }]}>
            {amountValue > 0 ? '+' : ''}{item.amount} €
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#8A2BE2" />
        </TouchableOpacity>
        <Text style={styles.title}>Mes Transactions</Text>
      </View>

      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#8A2BE2" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderItem}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun rechargement trouvé</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  backButton: { padding: 5, marginRight: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#8A2BE2' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dateText: { color: '#666', fontSize: 14 },
  typeText: { fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 14, color: '#555', marginRight: 10 },
  valueText: { fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#999', fontSize: 16 },
});