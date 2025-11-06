import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  requestNotificationPermissions,
  scheduleDailyReminder,
  cancelDailyReminder,
  getReminderSettings,
  areRemindersEnabled,
} from "../services/notificationService";

export default function NotificationSettings({ userId }) {
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [selectedHour, setSelectedHour] = useState(20);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    const enabled = await areRemindersEnabled(userId);
    const { hour, minute } = await getReminderSettings(userId);

    setRemindersEnabled(enabled);
    setSelectedHour(hour);
    setSelectedMinute(minute);
  };

  const toggleReminders = async (value) => {
    if (value) {
      // Aktivieren
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          "Benachrichtigungen deaktiviert",
          "Bitte erlaube Benachrichtigungen in den Einstellungen, um Erinnerungen zu erhalten.",
          [{ text: "OK" }]
        );
        return;
      }

      await scheduleDailyReminder(selectedHour, selectedMinute, userId);
      setRemindersEnabled(true);

      Alert.alert(
        "Erinnerungen aktiviert! 🔔",
        `Du erhältst täglich um ${formatTime(selectedHour, selectedMinute)} eine Erinnerung.`,
        [{ text: "OK" }]
      );
    } else {
      // Deaktivieren
      await cancelDailyReminder(userId);
      setRemindersEnabled(false);

      Alert.alert(
        "Erinnerungen deaktiviert",
        "Du erhältst keine täglichen Erinnerungen mehr.",
        [{ text: "OK" }]
      );
    }
  };

  const changeReminderTime = async (hour, minute) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setShowTimePicker(false);

    if (remindersEnabled) {
      await scheduleDailyReminder(hour, minute, userId);
      Alert.alert(
        "Zeit geändert ⏰",
        `Erinnerung auf ${formatTime(hour, minute)} geändert.`,
        [{ text: "OK" }]
      );
    }
  };

  const formatTime = (hour, minute) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <View style={styles.container}>
      <View style={styles.settingRow}>
        <View style={styles.settingIcon}>
          <Ionicons name="notifications" size={24} color="#007AFF" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>Tägliche Erinnerung</Text>
          <Text style={styles.settingSubtitle}>
            {remindersEnabled
              ? `Täglich um ${formatTime(selectedHour, selectedMinute)}`
              : "Keine Erinnerung"
            }
          </Text>
        </View>
        <Switch
          value={remindersEnabled}
          onValueChange={toggleReminders}
          trackColor={{ false: "#ccc", true: "#B3D9FF" }}
          thumbColor={remindersEnabled ? "#007AFF" : "#f4f3f4"}
        />
      </View>

      {remindersEnabled && (
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Ionicons name="time-outline" size={20} color="#007AFF" />
          <Text style={styles.timeButtonText}>Zeit ändern</Text>
        </TouchableOpacity>
      )}

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Erinnerungszeit wählen</Text>
              <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                <Ionicons name="close-circle" size={32} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.timePickerContainer}>
              <View style={styles.timeGrid}>
                {hours.map((hour) => (
                  <View key={hour} style={styles.hourSection}>
                    <Text style={styles.hourLabel}>{hour.toString().padStart(2, '0')}:</Text>
                    <View style={styles.minuteRow}>
                      {minutes.map((minute) => (
                        <TouchableOpacity
                          key={`${hour}-${minute}`}
                          style={[
                            styles.timeOption,
                            selectedHour === hour && selectedMinute === minute && styles.timeOptionSelected
                          ]}
                          onPress={() => changeReminderTime(hour, minute)}
                        >
                          <Text style={[
                            styles.timeOptionText,
                            selectedHour === hour && selectedMinute === minute && styles.timeOptionTextSelected
                          ]}>
                            {minute.toString().padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: "#8E8E93",
  },
  timeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E3F2FD",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#007AFF",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  timePickerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  timeGrid: {
    gap: 16,
  },
  hourSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  hourLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1C1C1E",
    width: 40,
  },
  minuteRow: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  timeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F7F9FC",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F7F9FC",
  },
  timeOptionSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1C1C1E",
  },
  timeOptionTextSelected: {
    color: "#fff",
  },
});
