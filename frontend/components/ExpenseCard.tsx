import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface StructuredData {
  merchant?: string;
  total?: string;
  date?: string;
  category?: string;
  gstno?: string;
  items?: string[];
}

interface ExpenseCardProps {
  data: StructuredData;
  onSave?: () => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({ data, onSave }) => {
  return (
    <Animated.View 
      entering={FadeInUp.duration(600)} 
      layout={Layout.springify()}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.merchantIconBg, { backgroundColor: '#333333' }]}>
          <Ionicons name="business" size={24} color="#FFFFFF" />
        </View>
        <View style={styles.merchantInfo}>
          <Text style={styles.merchantLabel}>Merchant</Text>
          <Text style={styles.merchantName}>{data.merchant || "Unknown Store"}</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{data.category || "General"}</Text>
        </View>
      </View>

      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Total Amount</Text>
        <Text style={styles.priceValue}>₹{data.total || "0.00"}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#777" />
          <Text style={styles.detailText}>{data.date || "N/A"}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="receipt-outline" size={16} color="#777" />
          <Text style={styles.detailText}>{data.gstno ? "GST Verified" : "No GST"}</Text>
        </View>
      </View>

      {data.items && data.items.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {data.items.slice(0, 5).map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemBullet}>•</Text>
              <Text style={styles.itemContent} numberOfLines={1}>{item}</Text>
            </View>
          ))}
          {data.items.length > 5 && (
            <Text style={styles.moreText}>+ {data.items.length - 5} more items</Text>
          )}
        </View>
      )}

      {onSave && (
        <TouchableOpacity style={styles.saveButton} onPress={onSave}>
          <Text style={styles.saveButtonText}>Confirm & Save</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.9,
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
    marginTop: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  merchantIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantLabel: {
    fontSize: 12,
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  merchantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  priceContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  priceLabel: {
    color: '#777',
    fontSize: 14,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 20,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#AAA',
    fontSize: 14,
  },
  itemsSection: {
    backgroundColor: '#222',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#777',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  itemBullet: {
    color: '#FFFFFF',
    marginRight: 8,
    fontWeight: 'bold',
  },
  itemContent: {
    color: '#DDD',
    fontSize: 14,
    flex: 1,
  },
  moreText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#fff',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
