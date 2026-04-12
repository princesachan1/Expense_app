import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface EditExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData: any;
  title?: string;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({ 
  visible, onClose, onSave, initialData, title = "Edit Expense" 
}) => {
  const [formData, setFormData] = useState(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)' }]} />
          )}

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color="#777" />
                </TouchableOpacity>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Merchant</Text>
                  <TextInput
                    style={styles.input}
                    value={formData?.merchant}
                    onChangeText={(text) => setFormData({ ...formData, merchant: text })}
                    placeholderTextColor="#444"
                    placeholder="e.g. Starbucks"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Amount (₹)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData?.total?.toString()}
                    onChangeText={(text) => setFormData({ ...formData, total: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor="#444"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Date</Text>
                  <TextInput
                    style={styles.input}
                    value={formData?.date}
                    onChangeText={(text) => setFormData({ ...formData, date: text })}
                    placeholderTextColor="#444"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.categoryRow}>
                    {['Food', 'Shopping', 'Bills', 'Travel'].map((cat) => (
                      <TouchableOpacity 
                        key={cat}
                        style={[
                          styles.catChip, 
                          formData?.category === cat && styles.activeChip
                        ]}
                        onPress={() => setFormData({ ...formData, category: cat })}
                      >
                        <Text style={[
                          styles.catText,
                          formData?.category === cat && styles.activeCatText
                        ]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={() => onSave(formData)}
              >
                <LinearGradient
                  colors={['#4CAF50', '#2E7D32']}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    gap: 20,
    marginBottom: 30,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: '#777',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#222',
    height: 54,
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  catChip: {
    backgroundColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  activeChip: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  catText: {
    color: '#AAA',
    fontSize: 14,
  },
  activeCatText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  saveBtn: {
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
