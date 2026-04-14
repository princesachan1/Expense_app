import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppRegistry, Platform, Alert } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SmsService } from '../services/SmsService';
import { KeepAliveService } from '../services/KeepAliveService';

const HANDLED_NOTIFICATION_KEY = '@last_handled_notification_id';

// 1. Tell expo-notifications to SHOW notifications even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 2. Create Android notification channel (required for Android 8+)
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('banking-alerts', {
    name: 'Banking Alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FFFFFF',
    sound: 'default',
  });
}

// 3. Background task to process banking SMS notifications (guard against hot-reload duplicates)
let _headlessRegistered = false;
if (!_headlessRegistered) {
  AppRegistry.registerHeadlessTask(
    RNAndroidNotificationListenerHeadlessJsName,
    () => (data: any) => SmsService.handleBackgroundNotification(data.notification)
  );
  _headlessRegistered = true;
}

export const unstable_settings = {
  // Ensure that reloading on `/login` keeps the user there
  initialRouteName: 'auth/login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    // 1. Reusable handler for notification responses
    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      if (data.type === 'transaction_detected') {
        const amount = String(data.amount || '');
        const merchant = String(data.merchant || '');
        const date = String(data.date || '');
        router.push(`/quick-add?amount=${encodeURIComponent(amount)}&merchant=${encodeURIComponent(merchant)}&date=${encodeURIComponent(date)}` as any);
      }
    };

    // Handle clicks when app is in foreground/background (warm start)
    // Also mark these as handled so cold-start check skips them
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const notifId = response.notification.request.identifier;
      await AsyncStorage.setItem(HANDLED_NOTIFICATION_KEY, notifId);
      handleNotificationResponse(response);
    });

    // Handle clicks that launched the app (cold start)
    // Guard: only process if we haven't already handled this exact notification
    Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (response) {
        const notifId = response.notification.request.identifier;
        const lastHandled = await AsyncStorage.getItem(HANDLED_NOTIFICATION_KEY);
        if (lastHandled === notifId) {
          console.log('RootLayout: Cold-start notification already handled, skipping.');
          return;
        }
        await AsyncStorage.setItem(HANDLED_NOTIFICATION_KEY, notifId);
        handleNotificationResponse(response);
      }
    });

    // 2. Initial permission checks
    const checkPermissions = async () => {
      // A. Standard Push Notifications
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
      
      // B. Banking SMS Notification Listener (Android Only)
      if (Platform.OS === 'android') {
        const status = await SmsService.checkPermissionStatus();
        if (status !== 'authorized' && status !== 'not_available') {
          Alert.alert(
            "Tracking Disabled",
            "Automatic expense tracking requires Notification Access. Would you like to enable it now?",
            [
              { text: "Later", style: "cancel" },
              { text: "Enable", onPress: () => SmsService.requestPermission() }
            ]
          );
        }
      }
    };

    checkPermissions();

    // 3. Start keep-alive pings to prevent HF Space from sleeping
    KeepAliveService.start();

    return () => {
      subscription.remove();
      KeepAliveService.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="quick-add" options={{ presentation: 'modal', title: 'Add Expense' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
