import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Modal, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard, ScrollView 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

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
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        items: initialData.items || []
      });
    }
  }, [initialData, visible]);

  // Parse stored "YYYY-MM-DD HH:mm" or "YYYY-MM-DD" into a Date
  const parseDateTime = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Split date and time parts
    const [datePart, timePart] = dateStr.split(' ');
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      if (timePart) {
        const [hours, minutes] = timePart.split(':').map(Number);
        return new Date(year, month, day, hours, minutes);
      }
      return new Date(year, month, day);
    }
    return new Date();
  };

  // Build "YYYY-MM-DD HH:mm" from current formData.date + a new date or time
  const buildDateTimeString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Preserve existing time from formData, only update the date part
      const existing = parseDateTime(formData?.date);
      selectedDate.setHours(existing.getHours(), existing.getMinutes());
      setFormData({ ...formData, date: buildDateTimeString(selectedDate) });
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      // Preserve existing date from formData, only update the time part
      const existing = parseDateTime(formData?.date);
      existing.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setFormData({ ...formData, date: buildDateTimeString(existing) });
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Select Date';
    const [datePart] = dateStr.split(' ');
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTimeDisplay = (dateStr: string) => {
    if (!dateStr) return 'Set Time';
    const [, timePart] = dateStr.split(' ');
    if (!timePart) return 'Set Time';
    const [h, m] = timePart.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
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
            <ScrollView 
              showsVerticalScrollIndicator={false}
              bounces={false}
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
                  <Text style={styles.label}>Date & Time</Text>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity 
                      style={[styles.input, styles.dateTimeInput]} 
                      onPress={() => setShowDatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#777" />
                      <Text style={[styles.dateText, !formData?.date && { color: '#444' }]}>
                        {formatDateDisplay(formData?.date)}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.input, styles.dateTimeInput]} 
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="time-outline" size={18} color="#777" />
                      <Text style={[styles.dateText, !formData?.date?.includes(' ') && { color: '#444' }]}>
                        {formatTimeDisplay(formData?.date)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={parseDateTime(formData?.date)}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDateChange}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={parseDateTime(formData?.date)}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onTimeChange}
                      is24Hour={false}
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

                {/* Items / Line Items Section */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Items / Description</Text>
                  <View style={styles.itemsList}>
                    {formData?.items?.map((item: string, idx: number) => (
                      <View key={idx} style={styles.itemRow}>
                        <View style={styles.itemBulletDot} />
                        <TextInput
                          style={styles.itemInput}
                          value={item}
                          onChangeText={(text) => {
                            const newItems = [...formData.items];
                            newItems[idx] = text;
                            setFormData({ ...formData, items: newItems });
                          }}
                          placeholder="Item description"
                          placeholderTextColor="#444"
                          multiline={false}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            const newItems = [...formData.items];
                            newItems.splice(idx, 1);
                            setFormData({ ...formData, items: newItems });
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={18} color="#FF5252" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    <TouchableOpacity 
                      style={styles.addItemBtn} 
                      onPress={() => {
                        const newItems = [...(formData?.items || []), ''];
                        setFormData({ ...formData, items: newItems });
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                      <Text style={styles.addItemText}>Add Item</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={() => {
                  if (formData) onSave(formData);
                }}
                disabled={!formData}
              >
                <View style={[styles.gradient, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.saveText, { color: '#000000' }]}>Save Changes</Text>
                </View>
              </TouchableOpacity>
            </View>
            </ScrollView>
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
    fontSize: 15,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeInput: {
    flex: 1,
    gap: 8,
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
  },
  itemsList: {
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  itemText: {
    color: '#CCC',
    fontSize: 14,
    flex: 1,
  },
  itemInput: {
    color: '#FFF',
    fontSize: 14,
    flex: 1,
    paddingVertical: 4,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 4,
  },
  addItemText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
