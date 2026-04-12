import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated as RNAnimated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface QuickActionModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: () => void;
  onGallery: () => void;
  onManual: () => void;
}

export function QuickActionModal({ visible, onClose, onScan, onGallery, onManual }: QuickActionModalProps) {
  const [animation] = React.useState(new RNAnimated.Value(0));

  React.useEffect(() => {
    if (visible) {
      RNAnimated.spring(animation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      RNAnimated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0]
  });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}
      >
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <RNAnimated.View style={[styles.container, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add Expense</Text>

          <TouchableOpacity style={styles.option} onPress={() => { onScan(); onClose(); }}>
            <LinearGradient colors={['#1c461cff', '#2E7D32']} style={styles.iconBg}>
              <Ionicons name="scan-outline" size={24} color="white" />
            </LinearGradient>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>AI Scan Receipt</Text>
              <Text style={styles.optionSub}>Instantly extract data using AI</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => { onGallery(); onClose(); }}>
            <View style={[styles.iconBg, { backgroundColor: '#222' }]}>
              <Ionicons name="image-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Choose from Gallery</Text>
              <Text style={styles.optionSub}>Select an existing photo</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.option} onPress={() => { onManual(); onClose(); }}>
            <View style={[styles.iconBg, { backgroundColor: '#222' }]}>
              <Ionicons name="create-outline" size={24} color="#3e9441ff" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>Manual Entry</Text>
              <Text style={styles.optionSub}>Type in expense details</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#222'
  },
  handle: { width: 40, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 24, textAlign: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222'
  },
  iconBg: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  optionTextContainer: { flex: 1, marginLeft: 16 },
  optionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  optionSub: { fontSize: 12, color: '#777', marginTop: 2 },
  cancelBtn: { marginTop: 8, padding: 16, alignItems: 'center' },
  cancelText: { color: '#777', fontSize: 16, fontWeight: '600' }
});
