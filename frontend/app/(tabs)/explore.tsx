import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';

// Refactored & New Imports
import { apiService, ExpenseRecord } from '../../services/apiService';
import { HistoryItem } from '../../components/HistoryItem';
import { EditExpenseModal } from '../../components/EditExpenseModal';

export default function HistoryScreen() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  
  // Edit State
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const loadData = async () => {
    try {
      const result = await apiService.fetchExpenses();
      if (result.success && result.expenses) {
        setExpenses(result.expenses);
        const total = result.expenses.reduce((sum, exp) => sum + exp.total, 0);
        setTotalSpent(total);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEditPress = (item: ExpenseRecord) => {
    setSelectedExpense(item);
    setIsEditModalVisible(true);
  };

  const handleUpdate = async (updatedData: any) => {
    if (!selectedExpense) return;
    
    try {
      const result = await apiService.updateExpense(selectedExpense.id, updatedData);
      if (result.success) {
        setIsEditModalVisible(false);
        loadData(); // Refresh the list
      }
    } catch (error) {
      Alert.alert("Update Failed", "Could not save changes to the database.");
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000000']} style={StyleSheet.absoluteFill} />

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>History 📊</Text>
          <View style={styles.statsCard}>
            <LinearGradient colors={['#222', '#111']} style={styles.statsGradient}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Spend</Text>
                <Text style={styles.statValue}>₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Records</Text>
                <Text style={styles.statValue}>{expenses.length}</Text>
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        <View style={styles.list}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 20 }} />
          ) : expenses.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>No expenses yet.</Text>
            </View>
          ) : (
            expenses.map((item, index) => (
              <HistoryItem 
                key={item.id} 
                item={item} 
                index={index} 
                onPress={() => handleEditPress(item)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <EditExpenseModal 
        visible={isEditModalVisible}
        title="Update Transaction"
        initialData={selectedExpense}
        onClose={() => setIsEditModalVisible(false)}
        onSave={handleUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  statsCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  statsGradient: { flexDirection: 'row', padding: 24, alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#777', fontSize: 12, textTransform: 'uppercase' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statDivider: { width: 1, height: 40, backgroundColor: '#333' },
  list: { marginBottom: 30, minHeight: 300 },
  sectionTitle: { color: '#777', fontSize: 14, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#444', marginTop: 16, fontSize: 16 }
});
