import { NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { RNAndroidNotificationListener } = NativeModules;

const STORE_KEY = '@last_detected_transaction';

// Common SMS App Package Names
const SMS_PACKAGES = [
  'com.google.android.apps.messaging',
  'com.android.mms',
  'com.samsung.android.messaging',
  'com.sonyericsson.conversations'
];

interface TransactionData {
  amount: string;
  merchant: string;
  date: string;
  originalText: string;
}

/**
 * Service to handle background SMS detection for banking transactions.
 */
export const SmsService = {
  
  /**
   * Static method to be called from the Headless JS Task.
   */
  async handleBackgroundNotification(notificationString: string | any) {
    try {
      let notification = notificationString;
      
      // The library sometimes passes a stringified JSON
      if (typeof notificationString === 'string') {
        notification = JSON.parse(notificationString);
      }

      const app = notification.app || '';
      const title = notification.title || '';
      const text = notification.text || '';

      // 1. Filter for SMS apps only
      if (!SMS_PACKAGES.includes(app)) return;

      console.log('SmsService: Processing notification:', { app, title });

      // 2. Extract transaction details
      const transaction = this.parseSms(title, text);
      if (transaction) {
        await this.handleDetectedTransaction(transaction);
      }
    } catch (error) {
      console.error('SmsService: Error in background task:', error);
    }
  },

  /**
   * Starts initialization logic (permission checks etc)
   */
  startListener() {
    if (!RNAndroidNotificationListener || typeof RNAndroidNotificationListener.getPermissionStatus !== 'function') {
      console.warn('SmsService: Notification Listener native module is not available. Are you using Expo Go? This feature requires a Development Build.');
      return;
    }

    RNAndroidNotificationListener.getPermissionStatus().then((status: string) => {
      console.log('SmsService: Notification Permission Status:', status);
    });
  },

  /**
   * Parses the SMS text to find amounts and bank patterns.
   */
  parseSms(sender: string, body: string): TransactionData | null {
    // 1. Robust regex for amounts: ₹500, Rs. 500, INR 500, 50.00
    const amountRegex = /(?:rs|inr|₹)\.?\s*([\d,]+\.?\d*)/i;
    
    // 2. Comprehensive debit keywords including 'Dr.', 'Sent', 'At'
    const isDebit = /debited|spent|paid|payment|transaction|transferred|dr\.|sent|purchased/i.test(body);
    const isOTP = /otp|verification|password|secret/i.test(body);

    if (isDebit && !isOTP) {
      const match = body.match(amountRegex);
      if (match) {
        const amount = match[1].replace(/,/g, '');
        
        // 3. Smart Merchant Detection
        // Look for 'To' or 'At' in the body first (e.g., "To Spotify", "At Starbucks")
        let merchant = '';
        const merchantMatch = body.match(/(?:to|at|info)\s+([\w\s.]{3,30})/i);
        
        if (merchantMatch) {
          merchant = merchantMatch[1].trim();
        } else {
          // Fallback to Bank ID (Sender)
          merchant = sender.includes('-') ? (sender.split('-').pop() || sender) : sender;
        }

        // Clean up merchant name (remove trailing common words)
        merchant = merchant.replace(/\.?\s*(?:ref|on|bal|avl).*/i, '').trim();
        
        return {
          amount,
          merchant: merchant || sender,
          date: new Date().toISOString().split('T')[0],
          originalText: body
        };
      }
    }
    return null;
  },

  /**
   * Saves the detected transaction and alerts the user.
   */
  async handleDetectedTransaction(tx: TransactionData) {
    try {
      // Save for the QuickAdd screen
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(tx));

      // Request notification permission (needed on Android 13+)
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      // Trigger local notification on the banking-alerts channel
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "💰 Payment Detected",
          body: `Spent ₹${tx.amount} at ${tx.merchant}. Tap to categorize!`,
          data: { type: 'transaction_detected', ...tx },
          sound: 'default',
        },
        trigger: null, // Show immediately
      });
      
      console.log('Processed Banking SMS:', tx);
    } catch (e) {
      console.error('Error handling transaction:', e);
    }
  },

  async getLastTransaction(): Promise<TransactionData | null> {
    const data = await AsyncStorage.getItem(STORE_KEY);
    return data ? JSON.parse(data) : null;
  },

  async clearLastTransaction() {
    await AsyncStorage.removeItem(STORE_KEY);
  }
};
