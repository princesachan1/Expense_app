import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface ActionButtonProps {
  onPress: () => void;
}

export function ActionButton({ onPress }: ActionButtonProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.button}
      >
        <View
          style={[styles.gradient, { backgroundColor: '#FFFFFF' }]}
        >
          <Ionicons name="add" size={32} color="black" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    transform: [{ translateY: -15 }], // Raises the button upward
    zIndex: 10,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  gradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
