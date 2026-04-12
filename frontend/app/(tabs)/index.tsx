import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Dimensions, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Refactored & New Imports
import { apiService, StructuredData } from '../../services/apiService';
import { ExpenseCard } from '../../components/ExpenseCard';
import { EditExpenseModal } from '../../components/EditExpenseModal';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [extractedData, setExtractedData] = useState<StructuredData | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const handleExtraction = async (photoUri: string) => {
    setIsLoading(true);
    setExtractedData(null);

    try {
      const result = await apiService.extractReceipt(photoUri);
      if (result.success && result.structured_data) {
        setExtractedData(result.structured_data);
      } else {
        Alert.alert("Extraction Failed", result.error || "Could not read the receipt.");
      }
    } catch (error) {
      Alert.alert("Connection Error", "Ensure your backend is running and Tailscale is active.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSaveExpense = async (finalData: any) => {
    try {
      const result = await apiService.saveExpense(finalData);
      if (result.success) {
        Alert.alert("Success", "Expense saved to database!");
        setExtractedData(null);
        setImage(null);
        setIsEditModalVisible(false);
      }
    } catch (error) {
      Alert.alert("Save Failed", "Could not connect to database.");
    }
  };

  const onScan = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      handleExtraction(result.assets[0].uri);
    }
  };

  const onPick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 1 });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
      handleExtraction(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a1a', '#000000']} style={StyleSheet.absoluteFill} />
      
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.subtitle}>Scan & Save</Text>
          <Text style={styles.title}>Expense AI 💸</Text>
        </Animated.View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.mainBtn} onPress={onScan}>
            <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.gradient} start={{x:0,y:0}} end={{x:1,y:0}}>
              <Ionicons name="scan-outline" size={24} color="white" />
              <Text style={styles.btnText}>Quick Scan</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.subBtn} onPress={onPick}>
            <Ionicons name="images-outline" size={20} color="#B0B0B0" />
            <Text style={styles.subBtnText}>Upload Image</Text>
          </TouchableOpacity>
        </View>

        {image && (
          <Animated.View entering={FadeInUp} style={styles.preview}>
            <Image source={{ uri: image }} style={styles.img} />
            {isLoading && (
              <View style={styles.overlay}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadMsg}>Reading Receipt...</Text>
              </View>
            )}
          </Animated.View>
        )}

        {extractedData && !isLoading && (
          <ExpenseCard 
            data={extractedData} 
            onSave={() => setIsEditModalVisible(true)} 
          />
        )}
      </ScrollView>

      <EditExpenseModal 
        visible={isEditModalVisible}
        title="Review Extraction"
        initialData={extractedData}
        onClose={() => setIsEditModalVisible(false)}
        onSave={onSaveExpense}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { paddingTop: 60, paddingBottom: 40, paddingHorizontal: 20, alignItems: 'center' },
  header: { width: '100%', marginBottom: 30 },
  subtitle: { fontSize: 16, color: '#777' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  actions: { width: '100%', gap: 16, marginBottom: 30 },
  mainBtn: { width: '100%', height: 60, borderRadius: 30, overflow: 'hidden' },
  gradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  subBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  subBtnText: { color: '#B0B0B0', fontSize: 15, fontWeight: '600' },
  preview: { width: width * 0.85, height: 350, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1A1A1A', marginBottom: 20 },
  img: { width: '100%', height: '100%', opacity: 0.7 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  loadMsg: { color: '#fff', marginTop: 15, fontSize: 14 }
});
