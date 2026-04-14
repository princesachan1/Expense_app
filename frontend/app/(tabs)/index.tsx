import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView, Dimensions, Alert,
  DeviceEventEmitter, NativeModules,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DocumentScanner from 'react-native-document-scanner-plugin';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';

const { RNAndroidNotificationListener } = NativeModules;

import { apiService, StructuredData, ExpenseRecord } from '../../services/apiService';
import { EditExpenseModal } from '../../components/EditExpenseModal';
import { HistoryItem } from '../../components/HistoryItem';
import { AuthService } from '../../services/AuthService';
import { SmsService } from '../../services/SmsService';
import { API_CONFIG } from '../../constants/config';

const { width } = Dimensions.get('window');

// ──────────────────────────────────────────
// Shared date parser (same as Analytics)
// ──────────────────────────────────────────
function parseExpenseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const native = new Date(raw);
  if (!isNaN(native.getTime())) return native;

  const parts = raw.split(/[-/]/);
  if (parts.length !== 3) return null;

  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10) - 1;
  let year = parseInt(parts[2], 10);

  if (parts[0].length === 4) {
    year = parseInt(parts[0], 10);
    day = parseInt(parts[2], 10);
  }
  if (year < 100) year += 2000;
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

  const d = new Date(year, month, day);
  return isNaN(d.getTime()) ? null : d;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [username, setUsername] = useState('User');
  const [hasNotificationAccess, setHasNotificationAccess] = useState(true);

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<StructuredData | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // ── Load & compute ──
  const loadHistory = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      if (user) {
        setUsername(user.full_name || user.username);
      }

      const result = await apiService.fetchExpenses();
      if (result.success && result.expenses) {
        setExpenses(result.expenses);

        const now = new Date();
        const curM = now.getMonth();
        const curY = now.getFullYear();

        let monthly = 0;

        result.expenses.forEach(exp => {
          const d = parseExpenseDate(exp.date);
          if (d && d.getMonth() === curM && d.getFullYear() === curY) {
            monthly += exp.total;
          }
        });

        setTotalThisMonth(monthly);
      }
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadHistory(); }, []));

  // ── Event listeners for the "+" action button ──
  useEffect(() => {
    SmsService.startListener();

    if (RNAndroidNotificationListener && typeof RNAndroidNotificationListener.getPermissionStatus === 'function') {
      RNAndroidNotificationListener.getPermissionStatus().then((status: string) => {
        setHasNotificationAccess(status === 'authorized');
      });
    } else {
      setHasNotificationAccess(true); // Hide banner in unsupported envs
    }

    const scanSub = DeviceEventEmitter.addListener('triggerScan', onScan);
    const gallerySub = DeviceEventEmitter.addListener('triggerGallery', onGallery);
    const manualSub = DeviceEventEmitter.addListener('triggerManual', () => {
      setExtractedData({
        merchant: '',
        total: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Other',
        gstno: '',
      });
      setIsEditModalVisible(true);
    });
    return () => {
      scanSub.remove();
      gallerySub.remove();
      manualSub.remove();
    };
  }, []);

  // ── AI Scan flow ──
  const prewarmBackend = () => {
    // Fire-and-forget: ping the backend so it's warm by the time the image is ready
    fetch(`${API_CONFIG.BASE_URL}/api/health`).catch(() => {});
  };

  const onScan = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Camera access is needed to scan receipts.');
      return;
    }

    prewarmBackend(); // Wake up backend while user scans

    try {
      const { scannedImages } = await DocumentScanner.scanDocument({
        maxNumDocuments: 1,
      });

      if (scannedImages && scannedImages.length > 0) {
        handleExtraction(scannedImages[0]);
      }
    } catch (error) {
      console.error('Document Scanner Error:', error);
      Alert.alert('Scanner Error', 'Failed to launch the document scanner.');
    }
  };

  const onGallery = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission Required', 'Gallery access is needed to pick receipts.');
      return;
    }

    prewarmBackend(); // Wake up backend while user picks image

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.5,  // Compressed for faster upload — OCR doesn't need full quality
      mediaTypes: ['images'],
    });

    if (!result.canceled && result.assets[0]) {
      handleExtraction(result.assets[0].uri);
    }
  };

  const handleExtraction = async (photoUri: string) => {
    setIsExtracting(true);
    setExtractedData(null);
    try {
      const result = await apiService.extractReceipt(photoUri);
      if (result.success && result.structured_data) {
        setExtractedData(result.structured_data);
        setIsEditModalVisible(true);
      } else {
        Alert.alert('Extraction Failed', result.error || 'Could not read the receipt.');
      }
    } catch {
      Alert.alert('Connection Error', 'Ensure your backend is running.');
    } finally {
      setIsExtracting(false);
    }
  };

  // ── Save ──
  const onSaveExpense = async (finalData: any) => {
    try {
      const result = await apiService.saveExpense(finalData);
      if (result.success) {
        Alert.alert('Success', 'Expense saved!');
        setExtractedData(null);
        setIsEditModalVisible(false);
        loadHistory();
      }
    } catch {
      Alert.alert('Save Failed', 'Could not connect to database.');
    }
  };

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000']} style={StyleSheet.absoluteFill} />

      {/* AI extraction overlay */}
      {isExtracting && (
        <View style={styles.overlay}>
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.overlayText}>AI is reading your receipt…</Text>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* SMS Setup Banner */}
        {!hasNotificationAccess && (
          <TouchableOpacity 
            style={styles.setupBanner}
            onPress={() => {
              if (RNAndroidNotificationListener && typeof RNAndroidNotificationListener.requestPermission === 'function') {
                RNAndroidNotificationListener.requestPermission();
              } else {
                Alert.alert('Not Supported', 'This feature requires a Development Build and cannot be tested in Expo Go.');
              }
            }}
          >
            <View style={styles.setupBannerIcon}>
              <Ionicons name="notifications-outline" size={24} color="#000" />
            </View>
            <View style={styles.setupBannerText}>
              <Text style={styles.setupBannerTitle}>Enable SMS Tracking</Text>
              <Text style={styles.setupBannerSub}>Tap to allow InstantLedger to detect bank transactions.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#AAA" />
          </TouchableOpacity>
        )}

        {/* ── Header ── */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{username} </Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push('/settings')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="person-circle-outline" size={42} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Main Summary Card ── */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.summaryCard}>
          <LinearGradient
            colors={['#f5f5f7ff', '#717070ff']}
            style={styles.summaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={[styles.summaryLabel, { color: '#201d1dff' }]}>Total Spent This Month</Text>
            <Text style={[styles.summaryAmount, { color: '#000000' }]}>
              ₹{totalThisMonth.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </Text>

            <View style={styles.chipRow}>
              <View style={styles.chip}>
                <Ionicons name="receipt-outline" size={14} color="#000000" />
                <Text style={styles.chipText}>{expenses.length} records</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>


        {/* ── Recent Transactions ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/history')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentList}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#52a452ff" style={{ marginTop: 20 }} />
          ) : expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#333" />
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptyHint}>
                Tap the + button to scan a receipt or add manually
              </Text>
            </View>
          ) : (
            expenses.slice(0, 5).map((item, index) => (
              <HistoryItem
                key={item.id}
                item={item}
                index={index}
                onPress={() => router.push('/history')}
                onDelete={async (id) => {
                  try {
                    const result = await apiService.deleteExpense(id);
                    if (result.success) {
                      loadHistory();
                    }
                  } catch (e) {
                    Alert.alert('Error', 'Failed to delete expense.');
                  }
                }}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Edit / Manual Entry Modal ── */}
      <EditExpenseModal
        visible={isEditModalVisible}
        title={extractedData?.merchant ? 'Confirm Details' : 'Manual Entry'}
        initialData={extractedData}
        onClose={() => setIsEditModalVisible(false)}
        onSave={onSaveExpense}
      />
    </View>
  );
}

// ──────────────────────────────────────────
// Styles
// ──────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingTop: 60, paddingBottom: 120, paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: { fontSize: 15, color: '#777' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  profileBtn: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },

  // Summary card
  summaryCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    elevation: 10,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  summaryGradient: { padding: 24 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  chipText: { color: '#000000', fontSize: 12, fontWeight: '700' },


  // Section
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  seeAll: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Recent list
  recentList: { minHeight: 100 },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: { color: '#555', fontSize: 16, fontWeight: '600', marginTop: 8 },
  emptyHint: { color: '#444', fontSize: 13, textAlign: 'center' },

  // Extracting overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  overlayContent: {
    alignItems: 'center',
  },
  overlayText: {
    color: '#FFFFFF',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  setupBanner: {
    backgroundColor: '#1A1A1A',
    marginBottom: 20,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  setupBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  setupBannerText: {
    flex: 1,
  },
  setupBannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  setupBannerSub: {
    color: '#777',
    fontSize: 12,
    marginTop: 2,
  },
});
