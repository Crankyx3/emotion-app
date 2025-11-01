import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, Typography, BorderRadius, Shadows } from "../theme";

export default function GuestBlockModal({ visible, onClose, onRegister, featureName }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E8E']}
            style={styles.modalGradient}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={48} color="#FFF" />
            </View>

            <Text style={styles.modalTitle}>
              Feature gesperrt
            </Text>

            <Text style={styles.modalMessage}>
              {featureName} ist nur für registrierte Nutzer verfügbar.
              {'\n\n'}
              Erstelle jetzt kostenlos einen Account und teste alle Premium-Features 5 Tage lang gratis!
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.featureText}>5 Tage Premium-Trial</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.featureText}>Unbegrenzte Einträge</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.featureText}>KI-Analysen & Chat</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={onRegister}
              activeOpacity={0.8}
            >
              <Text style={styles.registerButtonText}>Jetzt kostenlos registrieren</Text>
              <Ionicons name="arrow-forward" size={20} color="#FF6B6B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Weiter als Gast</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    ...Shadows.large,
  },
  modalGradient: {
    padding: Spacing.xxl,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h2,
    color: "#FFF",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  modalMessage: {
    ...Typography.body,
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  featureList: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  featureText: {
    ...Typography.bodyMedium,
    color: "#FFF",
    marginLeft: Spacing.sm,
    fontWeight: "600",
  },
  registerButton: {
    width: "100%",
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  registerButtonText: {
    ...Typography.bodyLarge,
    color: "#FF6B6B",
    fontWeight: "700",
    marginRight: Spacing.xs,
  },
  closeButton: {
    paddingVertical: Spacing.sm,
  },
  closeButtonText: {
    ...Typography.bodyMedium,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
  },
});
