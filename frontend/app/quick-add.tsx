import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SmsService } from '../services/SmsService';
import { apiService } from '../services/apiService';
import { ExpenseCard } from '../components/ExpenseCard';

export default function QuickAddScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    merchant: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [txData, setTxData] = useState<any>(null);

  // Track initialization to prevent re-render loops
  const initialized = React.useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    if (params.amount) {
      setFormData(prev => ({
        ...prev,
        amount: params.amount as string,
        merchant: params.merchant as string || 'Bank SMS',
        date: params.date as string || new Date().toISOString().split('T')[0],
      }));
      setTxData({
        amount: params.amount,
        merchant: params.merchant,
        date: params.date,
        originalText: params.originalText || ''
      });
      initialized.current = true;
    } else {
      SmsService.getLastTransaction().then(tx => {
        if (tx && !initialized.current) {
          setFormData(prev => ({
            ...prev,
            amount: tx.amount,
            merchant: tx.merchant,
            date: tx.date,
          }));
          setTxData(tx);
          initialized.current = true;
        }
      });
    }
  }, [params.amount, params.merchant, params.date]);

  const handleSave = async () => {
    if (!formData.description) {
      Alert.alert('Details Needed', 'Please enter what this payment was for so our AI can categorize it.');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please check the transaction amount.');
      return;
    }

    setLoading(true);
    try {
      // 1. Send to server. The description is used by the backend SpaCy model 
      // to determine the category automatically.
      const result = await apiService.saveExpense({
        total: amount,
        merchant: formData.merchant,
        date: formData.date,
        category: 'Pending...',
        items: [formData.description]
      });

      if (result.success) {
        await SmsService.clearLastTransaction();
        if (txData) {
          await SmsService.markAsProcessed(txData);
          await SmsService.dismissTransactionNotification();
        }
        Alert.alert('Success', 'Expense categorized and saved!');
        router.replace('/(tabs)/history');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Transaction</Text>
        </View>

        <View style={styles.cardContainer}>
          <ExpenseCard 
            data={{
              merchant: formData.merchant,
              total: formData.amount,
              date: formData.date,
              category: 'Pending...'
            }} 
          />
        </View>

        <View style={styles.promptSection}>
          <Text style={styles.promptText}>What was this payment for?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dinner with friends, Petrol, Rent..."
            placeholderTextColor="#444"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            autoFocus
          />
          <Text style={styles.subtext}>
            Our AI will automatically categorize this based on your description.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, !formData.description && styles.btnDisabled]} 
          onPress={handleSave}
          disabled={loading || !formData.description}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.saveBtnText}>Save and Categorize</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.ignoreBtn} 
          onPress={async () => {
            await SmsService.clearLastTransaction();
            if (txData) {
              await SmsService.markAsProcessed(txData);
              await SmsService.dismissTransactionNotification();
            }
            router.back();
          }}
        >
          <Text style={styles.ignoreBtnText}>Ignore Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backBtn: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardContainer: {
    marginBottom: 40,
    alignItems: 'center',
    width: '100%',
  },
  promptSection: {
    marginBottom: 40,
  },
  promptText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#222',
    height: 60,
    borderRadius: 16,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#333',
  },
  subtext: {
    fontSize: 13,
    color: '#555',
    marginTop: 12,
    fontStyle: 'italic',
  },
  saveBtn: {
    backgroundColor: '#fff',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ignoreBtn: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ignoreBtnText: {
    color: '#444',
    fontSize: 16,
  }
});
