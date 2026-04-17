import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/AuthService';
import { SmsService } from '../../services/SmsService';

import { useFocusEffect } from '@react-navigation/native';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [fullName, setFullName] = React.useState('');
  const [newName, setNewName] = React.useState('');
  const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const loadSettingsAndProfile = async () => {
    // Load profile
    const user = await AuthService.getCurrentUser();
    if (user) {
      setFullName(user.full_name || '');
    }
    // Load notification preference
    const enabled = await SmsService.getNotificationPreference();
    setNotifications(enabled);
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSettingsAndProfile();
    }, [])
  );

  const toggleNotifications = async (val: boolean) => {
    setNotifications(val);
    await SmsService.setNotificationPreference(val);

    if (val) {
      // If turning on, check system permissions
      const status = await SmsService.checkPermissionStatus();
      if (status !== 'authorized' && status !== 'not_available') {
        Alert.alert(
          "Permission Required",
          "You need to grant Notification Access for Auto Tracking to work.",
          [
            { text: "Later", style: "cancel" },
            { text: "Enable", onPress: () => SmsService.requestPermission() }
          ]
        );
      }
      console.log('User enabled notifications in app, system status:', status);
    }
  };

  const handleUpdateName = () => {
    setNewName(fullName);
    setIsEditModalVisible(true);
  };

  const saveProfileUpdate = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setIsSaving(true);
    try {
      const result = await AuthService.updateProfile(newName.trim());
      if (result.success) {
        setFullName(newName.trim());
        setIsEditModalVisible(false);
        Alert.alert('Success', 'Profile updated!');
      } else {
        Alert.alert('Error', result.detail || 'Could not update profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/auth/login');
  };

  const SettingItem = ({ icon, title, value, type = 'chevron', onPress }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      <View style={styles.itemRight}>
        {value && <Text style={styles.itemValue}>{value}</Text>}
        {type === 'chevron' && <Ionicons name="chevron-forward" size={18} color="#444" />}
      </View>
      {type === 'switch' && (
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: '#333', true: '#FFFFFF' }}
          thumbColor="#fff"
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000000']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingItem
              icon="person-outline"
              title="Profile Details"
              value={fullName || 'Not set'}
              onPress={handleUpdateName}
            />
            <SettingItem icon="notifications-outline" title="Notifications" type="switch" value={notifications} onPress={toggleNotifications} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingItem icon="language-outline" title="Language" />
            <SettingItem icon="shield-checkmark-outline" title="Privacy & Security" />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <SettingItem icon="help-circle-outline" title="Help Center" />
            <SettingItem icon="mail-outline" title="Contact Us" />
            <SettingItem icon="information-circle-outline" title="About App" />
          </View>
        </Animated.View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>

      {/* Cross-platform Name Editor Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Name</Text>
            <Text style={styles.modalSubtitle}>How should we address you?</Text>

            <TextInput
              style={styles.modalInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Full Name"
              placeholderTextColor="#666"
              autoFocus
              autoCapitalize="words"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={saveProfileUpdate}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={[styles.saveBtnText, { color: '#000' }]}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingTop: 60, paddingBottom: 100, paddingHorizontal: 20 },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  section: { marginBottom: 25 },
  sectionTitle: { color: '#777', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginLeft: 5 },
  card: { backgroundColor: '#161616', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  itemTitle: { color: '#EEE', fontSize: 16, fontWeight: '500' },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemValue: { color: '#666', fontSize: 14 },
  logoutBtn: { marginTop: 10, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255, 59, 48, 0.1)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', color: '#444', fontSize: 12, marginTop: 30 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#161616',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#222',
    elevation: 20,
  },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { color: '#888', fontSize: 14, marginBottom: 20 },
  modalInput: {
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    color: '#fff',
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cancelBtn: { backgroundColor: '#222' },
  saveBtn: { backgroundColor: '#FFFFFF' },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
});
