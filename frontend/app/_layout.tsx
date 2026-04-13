import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppRegistry, Platform } from 'react-native';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SmsService } from '../services/SmsService';

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
    // Handle notification clicks globally
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data.type === 'transaction_detected') {
        const amount = String(data.amount || '');
        const merchant = String(data.merchant || '');
        const date = String(data.date || '');
        router.push(`/quick-add?amount=${encodeURIComponent(amount)}&merchant=${encodeURIComponent(merchant)}&date=${encodeURIComponent(date)}` as any);
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
