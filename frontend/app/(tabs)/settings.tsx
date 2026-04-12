import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { AuthService } from '../../services/AuthService';

export default function SettingsScreen() {
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = React.useState(true);
  const [notifications, setNotifications] = React.useState(true);

  const handleLogout = async () => {
    await AuthService.logout();
    router.replace('/auth/login');
  };

  const SettingItem = ({ icon, title, value, type = 'chevron', onPress }: any) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <View style={styles.itemLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={icon} size={20} color="#4CAF50" />
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
      </View>
      {type === 'chevron' && <Ionicons name="chevron-forward" size={18} color="#444" />}
      {type === 'switch' && (
        <Switch 
          value={value} 
          onValueChange={onPress}
          trackColor={{ false: '#333', true: '#4CAF50' }}
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
          <Text style={styles.title}>Settings ⚙️</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingItem icon="person-outline" title="Profile Details" />
            <SettingItem icon="wallet-outline" title="Currency" value="INR (₹)" />
            <SettingItem icon="notifications-outline" title="Notifications" type="switch" value={notifications} onPress={() => setNotifications(!notifications)} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingItem icon="moon-outline" title="Dark Mode" type="switch" value={isDarkMode} onPress={() => setIsDarkMode(!isDarkMode)} />
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
  iconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(76, 175, 80, 0.1)', justifyContent: 'center', alignItems: 'center' },
  itemTitle: { color: '#EEE', fontSize: 16, fontWeight: '500' },
  logoutBtn: { marginTop: 10, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255, 59, 48, 0.1)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 59, 48, 0.3)' },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', color: '#444', fontSize: 12, marginTop: 30 }
});
