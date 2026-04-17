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

// ──────────────────────────────────────────
// Robust date parser that handles:
//   DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD and includes time like hh:mm AM/PM
// ──────────────────────────────────────────
function parseExpenseDate(raw: string | undefined | null): Date {
  if (!raw) return new Date(0); // extremely old fallback

  const datePart = raw.split(' ')[0];
  const timePart = raw.split(' ').slice(1).join(' ');

  const parts = datePart.split(/[-/]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    if (parts[0].length === 4) { // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      day = parseInt(parts[2], 10);
    }
    if (year < 100) year += 2000;

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      let hours = 0;
      let minutes = 0;
      if (timePart) {
        const timeMatch = timePart.match(/(\d+):(\d+)\s*(AM|PM)?/i);
        if (timeMatch) {
          hours = parseInt(timeMatch[1], 10);
          minutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3];
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
        }
      }
      return new Date(year, month, day, hours, minutes);
    }
  }

  const native = new Date(raw);
  return isNaN(native.getTime()) ? new Date(0) : native;
}

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
        // Sort descending by transaction date (newest first) instead of insertion id/created_at
        const sorted = [...result.expenses].sort((a, b) => {
          const dateA = parseExpenseDate(a.date).getTime();
          const dateB = parseExpenseDate(b.date).getTime();

          if (dateA === dateB) {
            // Tie-breaker: fallback to created_at descending
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return dateB - dateA;
        });

        setExpenses(sorted);
        const total = sorted.reduce((sum, exp) => sum + exp.total, 0);
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

  const handleDelete = async (id: number) => {
    try {
      const result = await apiService.deleteExpense(id);
      if (result.success) {
        loadData();
      }
    } catch (error) {
      Alert.alert("Delete Failed", "Could not delete this expense.");
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000000']} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
      >
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>History</Text>
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
          <Text style={styles.sectionTitle}>Transactions</Text>
          {isLoading && !refreshing ? (
            <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 20 }} />
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
                onDelete={handleDelete}
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
  scroll: { paddingTop: 60, paddingBottom: 100, paddingHorizontal: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  statsCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
  statsGradient: { flexDirection: 'row', padding: 24, alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statLabel: { color: '#777', fontSize: 12, textTransform: 'uppercase' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statDivider: { width: 1, height: 40, backgroundColor: '#333' },
  list: { marginBottom: 30, minHeight: 400 },
  sectionTitle: { color: '#777', fontSize: 14, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#444', marginTop: 16, fontSize: 16 }
});
