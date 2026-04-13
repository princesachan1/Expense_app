import { NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { RNAndroidNotificationListener } = NativeModules;

const STORE_KEY = '@last_detected_transaction';
const NOTIFICATION_PREF_KEY = '@notifications_enabled';

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
   * Checks the current system permission for notification listening.
   * Returns 'authorized' or 'denied'.
   */
  async checkPermissionStatus(): Promise<string> {
    if (!RNAndroidNotificationListener || typeof RNAndroidNotificationListener.getPermissionStatus !== 'function') {
      return 'not_available';
    }
    return await RNAndroidNotificationListener.getPermissionStatus();
  },

  /**
   * Opens the system settings to grant permission.
   */
  requestPermission() {
    if (RNAndroidNotificationListener && typeof RNAndroidNotificationListener.requestPermission === 'function') {
      RNAndroidNotificationListener.requestPermission();
    }
  },

  /**
   * Legacy method for starting (can be removed later if unused)
   */
  startListener() {
    this.checkPermissionStatus().then(status => {
      console.log('SmsService: Permission Status:', status);
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
      // 1. Check user preference first
      const isEnabled = await this.getNotificationPreference();
      if (!isEnabled) {
        console.log('SmsService: Notifications are disabled in app settings. Skipping alert.');
        // We still save the transaction so they can see it in Quick Add later if they open it
        await AsyncStorage.setItem(STORE_KEY, JSON.stringify(tx));
        return;
      }

      // 2. Save for the QuickAdd screen
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(tx));

      // 3. Request notification permission (needed on Android 13+)
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: finalStatus } = await Notifications.requestPermissionsAsync();
        if (finalStatus !== 'granted') return;
      }

      // 4. Trigger local notification on the banking-alerts channel
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

  async getNotificationPreference(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(NOTIFICATION_PREF_KEY);
      // Default to true if not set
      return val === null ? true : val === 'true';
    } catch (e) {
      return true;
    }
  },

  async setNotificationPreference(enabled: boolean) {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREF_KEY, enabled.toString());
    } catch (e) {
      console.error('Error saving notification preference:', e);
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
