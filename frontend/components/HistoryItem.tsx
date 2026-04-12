import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ExpenseRecord {
  id: number;
  merchant: string;
  total: number;
  date: string;
  category: string;
  created_at: string;
}

interface HistoryItemProps {
  item: ExpenseRecord;
  index: number;
  onPress?: () => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, index, onPress }) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(index < 10 ? 200 + index * 100 : 0).duration(600)}
    >
      <TouchableOpacity style={styles.card} onPress={onPress}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getCategoryIcon(item.category)} 
            size={22} 
            color="#4CAF50" 
          />
        </View>
        
        <View style={styles.details}>
          <Text style={styles.merchant}>{item.merchant}</Text>
          <Text style={styles.date}>{item.date || new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        
        <View style={styles.amountWrap}>
          <Text style={styles.amount}>₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{item.category}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getCategoryIcon = (category: string) => {
  if (!category) return 'card';
  switch (category.toLowerCase()) {
    case 'food': return 'fast-food';
    case 'shopping': return 'cart';
    case 'transport': return 'car';
    case 'bills': return 'receipt';
    case 'entertainment': return 'play';
    default: return 'card';
  }
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#222',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  merchant: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    color: '#666',
    fontSize: 13,
  },
  amountWrap: {
    alignItems: 'flex-end',
  },
  amount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tag: {
    backgroundColor: '#222',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: '#4CAF50',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
