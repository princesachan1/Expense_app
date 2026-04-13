import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';

import { ExpenseRecord } from '../services/apiService';

interface HistoryItemProps {
  item: ExpenseRecord;
  index: number;
  onPress?: () => void;
  onDelete?: (id: number) => void;
}

export const HistoryItem: React.FC<HistoryItemProps> = ({ item, index, onPress, onDelete }) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    dragX: RNAnimated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });

    const opacity = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <RNAnimated.View style={[styles.deleteContainer, { opacity }]}>
        <RNAnimated.View style={{ transform: [{ translateX }] }}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              swipeableRef.current?.close();
              onDelete?.(item.id);
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </RNAnimated.View>
    );
  };

  const cardContent = (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={getCategoryIcon(item.category)} 
          size={22} 
          color="#FFFFFF" 
        />
      </View>
      
      <View style={styles.details}>
        <Text style={styles.merchant}>{item.merchant}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.date}>{item.date || new Date(item.created_at).toLocaleDateString()}</Text>
          {item.gstno ? (
            <Text style={styles.gstTag}> • GST: {item.gstno}</Text>
          ) : null}
        </View>
        {item.items && item.items.length > 0 && (
          <Text style={styles.itemsPreview} numberOfLines={1}>
            {item.items.slice(0, 3).join(', ')}
            {item.items.length > 3 ? ` +${item.items.length - 3} more` : ''}
          </Text>
        )}
      </View>
      
      <View style={styles.amountWrap}>
        <Text style={styles.amount}>₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Animated.View 
      entering={FadeInDown.delay(index < 10 ? 200 + index * 100 : 0).duration(600)}
    >
      {onDelete ? (
        <Swipeable
          ref={swipeableRef}
          renderRightActions={renderRightActions}
          overshootRight={false}
          friction={2}
          rightThreshold={40}
        >
          {cardContent}
        </Swipeable>
      ) : (
        cardContent
      )}
    </Animated.View>
  );
};

function getCategoryIcon(category: string): React.ComponentProps<typeof Ionicons>['name'] {
  if (!category) return 'card';
  const map: Record<string, any> = {
    'groceries': 'basket',
    'fuel & transport': 'car',
    'food': 'fast-food',
    'bills & utilities': 'flash',
    'shopping': 'cart',
    'entertainment': 'film',
    'health': 'medkit',
    'education': 'school',
    'travel': 'airplane',
    'personal care': 'body',
    'other': 'ellipsis-horizontal',
  };
  return map[category.toLowerCase()] || 'card';
}

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
    backgroundColor: '#333333',
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
    fontSize: 12,
  },
  gstTag: {
    color: '#444',
    fontSize: 11,
    fontStyle: 'italic',
  },
  itemsPreview: {
    color: '#555',
    fontSize: 11,
    marginTop: 3,
    fontStyle: 'italic',
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Swipe-to-delete styles
  deleteContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  deleteBtn: {
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 20,
    gap: 4,
  },
  deleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
