import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData, visible]);

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Store in YYYY-MM-DD format
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      setFormData({ ...formData, date: dateString });
    }
  };

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return new Date();
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // Display as DD/MM/YYYY
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

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
                  <TouchableOpacity 
                    style={styles.input} 
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dateText, !formData?.date && { color: '#444' }]}>
                      {formatDateDisplay(formData?.date)}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#777" />
                  </TouchableOpacity>

                  {showDatePicker && (
                    <DateTimePicker
                      value={parseDate(formData?.date)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                    />
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>GST Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData?.gstno}
                    onChangeText={(text) => setFormData({ ...formData, gstno: text })}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    placeholderTextColor="#444"
                    autoCapitalize="characters"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Category</Text>
                  <View style={styles.categoryRow}>
                    {[
                      'Groceries', 'Fuel & Transport', 'Food', 'Bills & Utilities', 
                      'Shopping', 'Entertainment', 'Health', 'Education', 
                      'Travel', 'Personal Care', 'Other'
                    ].map((cat) => (
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
                <View style={[styles.gradient, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.saveText, { color: '#000000' }]}>Save Changes</Text>
                </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
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
    borderColor: '#FFFFFF',
    backgroundColor: '#333333',
  },
  catText: {
    color: '#AAA',
    fontSize: 14,
  },
  activeCatText: {
    color: '#FFFFFF',
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
