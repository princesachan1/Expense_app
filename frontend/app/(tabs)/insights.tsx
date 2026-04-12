import { useState, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { apiService, ExpenseRecord } from '../../services/apiService';

const { width } = Dimensions.get('window');

export default function InsightsScreen() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const result = await apiService.fetchExpenses();
      if (result.success && result.expenses) {
        setExpenses(result.expenses);
        calculateInsights(result.expenses);
      }
    } catch (error) {
      console.error("Insights load error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateInsights = (data: ExpenseRecord[]) => {
    const totals: any = {};
    let grandTotal = 0;

    data.forEach(exp => {
      const cat = exp.category || "Other";
      totals[cat] = (totals[cat] || 0) + exp.total;
      grandTotal += exp.total;
    });

    const formatted = Object.keys(totals).map(cat => ({
      name: cat,
      amount: totals[cat],
      percent: grandTotal > 0 ? (totals[cat] / grandTotal) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);

    setCategoryData(formatted);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000000']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>Spending Insights 📈</Text>
        </Animated.View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        ) : expenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="analytics-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Not enough data for insights.</Text>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(200)} style={styles.mainStat}>
              <Text style={styles.statLabel}>Monthly Breakdown</Text>
              
              <View style={styles.chartContainer}>
                {/* Custom CSS-based Ring Chart for maximum compatibility */}
                <View style={styles.ringChart}>
                  {categoryData.slice(0, 1).map((item, i) => (
                    <View key={i} style={styles.centerNode}>
                      <Text style={styles.centerPercent}>{Math.round(item.percent)}%</Text>
                      <Text style={styles.centerLabel}>{item.name}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.legend}>
                  {categoryData.map((item, i) => (
                    <View key={i} style={styles.legendItem}>
                      <View style={[styles.dot, { backgroundColor: getCatColor(i) }]} />
                      <Text style={styles.legendName}>{item.name}</Text>
                      <Text style={styles.legendAmount}>₹{item.amount.toFixed(0)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Animated.View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category Efficiency</Text>
              {categoryData.map((item, i) => (
                <Animated.View 
                  key={i} 
                  entering={FadeInDown.delay(300 + i * 100)}
                  style={styles.progressRow}
                >
                  <View style={styles.rowLabels}>
                    <Text style={styles.rowName}>{item.name}</Text>
                    <Text style={styles.rowPercent}>{Math.round(item.percent)}%</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[
                      styles.progressBarFill, 
                      { width: `${item.percent}%`, backgroundColor: getCatColor(i) }
                    ]} />
                  </View>
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const getCatColor = (i: number) => {
  const colors = ['#4CAF50', '#81C784', '#2E7D32', '#A5D6A7', '#1B5E20'];
  return colors[i % colors.length];
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  mainStat: {
    backgroundColor: '#161616',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 30,
  },
  statLabel: { color: '#777', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 },
  chartContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringChart: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderStyle: 'dotted'
  },
  centerNode: { alignItems: 'center' },
  centerPercent: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  centerLabel: { color: '#777', fontSize: 10 },
  legend: { flex: 1, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { color: '#AAA', fontSize: 14, flex: 1 },
  legendAmount: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { gap: 20 },
  sectionTitle: { color: '#777', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  progressRow: { gap: 8 },
  rowLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowPercent: { color: '#777', fontSize: 14 },
  progressBarBg: { height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { color: '#444', marginTop: 16, fontSize: 16 }
});
