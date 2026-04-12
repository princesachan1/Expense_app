import { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, ScrollView, Dimensions,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { apiService, ExpenseRecord } from '../../services/apiService';

const { width } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ──────────────────────────────────────────
// Robust date parser that handles:
//   DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, DD-MM-YY,
//   YYYY-MM-DD  (ISO), and native Date strings.
// ──────────────────────────────────────────
function parseExpenseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;

  // 1. Try native parsing first (covers ISO 8601 & full date strings)
  const native = new Date(raw);
  if (!isNaN(native.getTime())) return native;

  // 2. Manual split for DD/MM/YYYY or DD-MM-YY etc.
  const parts = raw.split(/[-/]/);
  if (parts.length !== 3) return null;

  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1; // 0-indexed
  let year = parseInt(parts[2], 10);

  // Detect YYYY-MM-DD (first part is 4 digits)
  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    day = parseInt(parts[2], 10);
  }

  // Handle 2-digit year  (e.g. 26 → 2026)
  if (year < 100) year += 2000;

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

// ──────────────────────────────────────────
// Category colours (11 slots)
// ──────────────────────────────────────────
const CAT_COLORS = [
  '#4CAF50', '#FF9800', '#F44336', '#2196F3', '#9C27B0',
  '#FFEB3B', '#E91E63', '#00BCD4', '#FF5722', '#8BC34A', '#607D8B',
];
const getCatColor = (i: number) => CAT_COLORS[i % CAT_COLORS.length];

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
interface CategoryStat {
  name: string;
  amount: number;
  percent: number;
}

export default function AnalyticsScreen() {
  const [allExpenses, setAllExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [categoryData, setCategoryData] = useState<CategoryStat[]>([]);
  const [periodTotal, setPeriodTotal] = useState(0);
  const [dailySpend, setDailySpend] = useState<Record<number, { total: number; count: number }>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [maxDailySpend, setMaxDailySpend] = useState(0);

  const monthScrollRef = useRef<ScrollView>(null);

  // ── Fetch data on focus ──
  const loadData = async () => {
    try {
      const result = await apiService.fetchExpenses();
      if (result.success && result.expenses) {
        setAllExpenses(result.expenses);
      }
    } catch (error) {
      console.error('Analytics load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // ── Recalculate whenever period or data changes ──
  useEffect(() => {
    setSelectedDay(null); // reset day selection on period change

    if (allExpenses.length === 0) {
      setCategoryData([]);
      setPeriodTotal(0);
      setDailySpend({});
      setMaxDailySpend(0);
      return;
    }

    const totals: Record<string, number> = {};
    const daily: Record<number, { total: number; count: number }> = {};
    let grandTotal = 0;

    allExpenses.forEach(exp => {
      const d = parseExpenseDate(exp.date);
      if (!d) return;
      if (d.getMonth() !== selectedMonth) return;
      if (d.getFullYear() !== selectedYear) return;

      const cat = exp.category || 'Other';
      totals[cat] = (totals[cat] || 0) + exp.total;
      grandTotal += exp.total;

      // Build daily map
      const dayNum = d.getDate();
      if (!daily[dayNum]) daily[dayNum] = { total: 0, count: 0 };
      daily[dayNum].total += exp.total;
      daily[dayNum].count += 1;
    });

    const sorted = Object.entries(totals)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const maxDay = Object.values(daily).reduce((mx, d) => Math.max(mx, d.total), 0);

    setCategoryData(sorted);
    setPeriodTotal(grandTotal);
    setDailySpend(daily);
    setMaxDailySpend(maxDay);
  }, [selectedMonth, selectedYear, allExpenses]);

  // ── Auto-scroll to selected month chip ──
  useEffect(() => {
    // Each chip is roughly 56px wide + 10px gap
    monthScrollRef.current?.scrollTo({ x: Math.max(0, selectedMonth * 66 - width / 2 + 33), animated: true });
  }, [selectedMonth]);

  // ── Build calendar grid for the selected month ──
  const buildCalendarGrid = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();
    const isCurrentMonth = today.getMonth() === selectedMonth && today.getFullYear() === selectedYear;

    const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const cellSize = (width - 32 - 20) / 7; // 16px scroll padding each side, 20px card padding

    const rows: JSX.Element[] = [];

    // Weekday header
    rows.push(
      <View key="hdr" style={styles.calRow}>
        {WEEKDAYS.map(d => (
          <View key={d} style={[styles.calCell, { width: cellSize, height: 28 }]}>
            <Text style={styles.calWeekday}>{d}</Text>
          </View>
        ))}
      </View>
    );

    // Day cells
    let cells: JSX.Element[] = [];

    // Leading blanks
    for (let b = 0; b < firstDay; b++) {
      cells.push(<View key={`blank-${b}`} style={[styles.calCell, { width: cellSize, height: cellSize }]} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const info = dailySpend[day];
      const hasData = !!info;
      const isToday = isCurrentMonth && today.getDate() === day;
      const isSelected = selectedDay === day;

      // Heat intensity: 0 → transparent, 1 → full green
      const intensity = hasData && maxDailySpend > 0 ? Math.max(0.15, info.total / maxDailySpend) : 0;

      cells.push(
        <TouchableOpacity
          key={day}
          onPress={() => setSelectedDay(isSelected ? null : day)}
          style={[
            styles.calCell,
            { width: cellSize, height: cellSize + 12 },
            hasData && { backgroundColor: `rgba(76,175,80,${intensity * 0.6})` },
            isToday && styles.calToday,
            isSelected && styles.calSelected,
          ]}
        >
          {hasData && (
            <Text style={styles.calAmount}>
              ₹{info.total >= 1000 ? `${(info.total / 1000).toFixed(1)}k` : Math.round(info.total)}
            </Text>
          )}
          <Text style={[
            styles.calDayText,
            hasData && styles.calDayTextActive,
            isToday && styles.calTodayText,
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );

      // New row every 7 cells
      if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
        // Pad trailing blanks for last row
        if (day === daysInMonth) {
          const remaining = 7 - cells.length % 7;
          if (remaining < 7) {
            for (let t = 0; t < remaining; t++) {
              cells.push(<View key={`trail-${t}`} style={[styles.calCell, { width: cellSize, height: cellSize }]} />);
            }
          }
        }
        rows.push(<View key={`row-${day}`} style={styles.calRow}>{cells}</View>);
        cells = [];
      }
    }

    return rows;
  };

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>Analytics 📈</Text>
        </Animated.View>

        {/* ── Year Selector ── */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.yearRow}>
          <TouchableOpacity
            onPress={() => setSelectedYear(y => y - 1)}
            style={styles.yearArrow}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#4CAF50" />
          </TouchableOpacity>

          <Text style={styles.yearText}>{selectedYear}</Text>

          <TouchableOpacity
            onPress={() => setSelectedYear(y => y + 1)}
            style={styles.yearArrow}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={22} color="#4CAF50" />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Month Selector ── */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.monthRow}>
          <ScrollView
            ref={monthScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthScroll}
          >
            {MONTHS.map((label, i) => {
              const active = selectedMonth === i;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => setSelectedMonth(i)}
                  style={[styles.monthChip, active && styles.monthChipActive]}
                >
                  <Text style={[styles.monthChipText, active && styles.monthChipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── Content ── */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
        ) : allExpenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="analytics-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>Not enough data for analytics.</Text>
          </View>
        ) : (
          <>
            {/* ── Calendar Grid ── */}
            <Animated.View entering={FadeInDown.delay(250)} style={styles.calCard}>
              <Text style={styles.calTitle}>
                {MONTHS[selectedMonth]} {selectedYear}
              </Text>

              {buildCalendarGrid()}

              {/* Day detail tooltip */}
              {selectedDay !== null && dailySpend[selectedDay] && (
                <View style={styles.dayDetail}>
                  <View style={styles.dayDetailRow}>
                    <Ionicons name="calendar" size={16} color="#4CAF50" />
                    <Text style={styles.dayDetailDate}>
                      {selectedDay} {MONTHS[selectedMonth]} {selectedYear}
                    </Text>
                  </View>
                  <View style={styles.dayDetailRow}>
                    <Text style={styles.dayDetailLabel}>Spent</Text>
                    <Text style={styles.dayDetailAmount}>
                      ₹{dailySpend[selectedDay].total.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.dayDetailRow}>
                    <Text style={styles.dayDetailLabel}>Transactions</Text>
                    <Text style={styles.dayDetailCount}>
                      {dailySpend[selectedDay].count}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>

            {categoryData.length === 0 ? (
              <Animated.View entering={FadeInDown.delay(300)} style={styles.empty}>
                <Ionicons name="calendar-outline" size={64} color="#333" />
                <Text style={styles.emptyText}>
                  No transactions in {MONTHS[selectedMonth]} {selectedYear}
                </Text>
              </Animated.View>
            ) : (
              <>
                {/* ── Breakdown Card ── */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>{MONTHS[selectedMonth]} Breakdown</Text>
                    <Text style={styles.cardTotal}>₹{periodTotal.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.chartContainer}>
                    {/* Ring chart */}
                    <View style={styles.ringChart}>
                      {categoryData.length > 0 && (
                        <View style={styles.centerNode}>
                          <Text style={styles.centerPercent}>
                            {Math.round(categoryData[0].percent)}%
                          </Text>
                          <Text style={styles.centerLabel}>{categoryData[0].name}</Text>
                        </View>
                      )}
                    </View>

                    {/* Legend */}
                    <View style={styles.legend}>
                      {categoryData.map((item, i) => (
                        <View key={i} style={styles.legendItem}>
                          <View style={[styles.dot, { backgroundColor: getCatColor(i) }]} />
                          <Text style={styles.legendName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.legendAmount}>₹{item.amount.toLocaleString('en-IN')}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </Animated.View>

                {/* ── Category Efficiency ── */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Category Efficiency</Text>
                  {categoryData.map((item, i) => (
                    <Animated.View
                      key={`${selectedMonth}-${selectedYear}-${i}`}
                      entering={FadeInDown.delay(350 + i * 80)}
                      style={styles.progressRow}
                    >
                      <View style={styles.rowLabels}>
                        <Text style={styles.rowName}>{item.name}</Text>
                        <Text style={styles.rowPercent}>{Math.round(item.percent)}%</Text>
                      </View>
                      <View style={styles.barBg}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${item.percent}%`, backgroundColor: getCatColor(i) },
                          ]}
                        />
                      </View>
                    </Animated.View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingTop: 60, paddingBottom: 100, paddingHorizontal: 16 },

  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },

  // Year
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 24,
  },
  yearArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#161616',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  yearText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },

  // Month
  monthRow: { marginBottom: 28 },
  monthScroll: { gap: 10 },
  monthChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#333',
  },
  monthChipActive: {
    backgroundColor: 'rgba(76,175,80,0.12)',
    borderColor: '#4CAF50',
  },
  monthChipText: { color: '#666', fontSize: 14, fontWeight: '600' },
  monthChipTextActive: { color: '#4CAF50' },

  // Breakdown card
  card: {
    backgroundColor: '#161616',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 30,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardLabel: { color: '#777', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  cardTotal: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  chartContainer: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  ringChart: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, borderColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
    borderStyle: 'dotted',
  },
  centerNode: { alignItems: 'center' },
  centerPercent: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  centerLabel: { color: '#777', fontSize: 10 },

  legend: { flex: 1, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { color: '#AAA', fontSize: 14, flex: 1 },
  legendAmount: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Category efficiency
  section: { gap: 20 },
  sectionTitle: { color: '#777', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  progressRow: { gap: 8 },
  rowLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  rowName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowPercent: { color: '#777', fontSize: 14 },
  barBg: { height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },

  // Empty
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100 },
  emptyText: { color: '#444', marginTop: 16, fontSize: 16 },

  // Calendar
  calCard: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 10,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  calTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  calRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
  },
  calWeekday: {
    color: '#555',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  calDayText: {
    color: '#555',
    fontSize: 13,
    fontWeight: '500',
  },
  calDayTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  calAmount: {
    color: '#ffffffff',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },
  calToday: {
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  calTodayText: {
    color: '#4CAF50',
  },
  calSelected: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  calDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
    marginTop: 2,
  },
  dayDetail: {
    marginTop: 14,
    backgroundColor: '#1f1f1f',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dayDetailDate: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  dayDetailLabel: {
    color: '#777',
    fontSize: 13,
  },
  dayDetailAmount: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayDetailCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
