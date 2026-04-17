import { Tabs, useRouter } from 'expo-router';
import React, { useState, useLayoutEffect } from 'react';
import { Platform, View, StyleSheet, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/haptic-tab';
import { ActionButton } from '@/components/ActionButton';
import { QuickActionModal } from '@/components/QuickActionModal';
import { AuthService } from '../../services/AuthService';

export default function TabLayout() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    AuthService.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        router.replace('/auth/login');
      } else {
        setIsReady(true);
      }
    });
  }, []);

  if (!isReady) return null;

  const handleScan = async () => {
    DeviceEventEmitter.emit('triggerScan');
  };

  const handleManual = () => {
    DeviceEventEmitter.emit('triggerManual');
  };

  const handleGallery = () => {
    DeviceEventEmitter.emit('triggerGallery');
  };

  const handleVoice = () => {
    DeviceEventEmitter.emit('triggerVoice');
  };

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: '#888',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            backgroundColor: '#121212',
            borderTopColor: '#222',
            height: Platform.OS === 'ios' ? 90 : 70,
            paddingBottom: Platform.OS === 'ios' ? 30 : 10,
            position: 'absolute',
            borderTopWidth: 1,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 4,
          }
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "pie-chart" : "pie-chart-outline"} size={24} color={color} />
            ),
          }}
        />
        
        {/* Placeholder for the center button */}
        <Tabs.Screen
          name="plus_dummy"
          options={{
            title: '',
            tabBarButton: () => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActionButton onPress={() => setModalVisible(true)} />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "time" : "time-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
            ),
          }}
        />

      </Tabs>

      <QuickActionModal 
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onScan={handleScan}
        onGallery={handleGallery}
        onManual={handleManual}
        onVoice={handleVoice}
      />
    </>
  );
}
