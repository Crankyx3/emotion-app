import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, CardStyles, Spacing, Typography, BorderRadius } from '../theme';

// Base Card Component
export const Card = ({ children, style, variant = 'base', onPress }) => {
  const cardStyle = CardStyles[variant] || CardStyles.base;

  if (onPress) {
    return (
      <TouchableOpacity
        style={[cardStyle, styles.card, style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[cardStyle, styles.card, style]}>
      {children}
    </View>
  );
};

// Card Header with Icon and Title
export const CardHeader = ({ icon, iconColor, title, subtitle, action }) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {icon && (
          <View style={[styles.iconContainer, iconColor && { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={icon} size={24} color={iconColor || Colors.primary} />
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {action}
    </View>
  );
};

// Card Content
export const CardContent = ({ children, style }) => {
  return <View style={[styles.content, style]}>{children}</View>;
};

// Card Footer
export const CardFooter = ({ children, style }) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

// Menu Card Item (for navigation lists)
export const MenuCard = ({ icon, iconColor, title, subtitle, badge, onPress }) => {
  return (
    <Card onPress={onPress} variant="compact">
      <View style={styles.menuCard}>
        {icon && (
          <View style={[styles.menuIcon, iconColor && { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={icon} size={28} color={iconColor || Colors.primary} />
          </View>
        )}
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
        {badge}
        <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
      </View>
    </Card>
  );
};

// Info Card with colored border
export const InfoCard = ({ type = 'info', icon, title, message, children }) => {
  const typeColors = {
    info: Colors.primary,
    success: Colors.success,
    warning: Colors.warning,
    error: Colors.error,
  };

  const typeBackgrounds = {
    info: Colors.primaryLight,
    success: Colors.successLight,
    warning: Colors.warningLight,
    error: Colors.errorLight,
  };

  return (
    <View style={[
      styles.infoCard,
      {
        backgroundColor: typeBackgrounds[type],
        borderLeftColor: typeColors[type],
      }
    ]}>
      {icon && <Ionicons name={icon} size={24} color={typeColors[type]} style={styles.infoIcon} />}
      <View style={styles.infoContent}>
        {title && <Text style={[styles.infoTitle, { color: typeColors[type] }]}>{title}</Text>}
        {message && <Text style={styles.infoMessage}>{message}</Text>}
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h4,
  },
  headerSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  content: {
    // Empty - just container
  },
  footer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  // Menu Card
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.bodyMedium,
  },
  menuSubtitle: {
    ...Typography.caption,
    marginTop: 4,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  infoIcon: {
    marginRight: Spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    ...Typography.bodyBold,
    marginBottom: 4,
  },
  infoMessage: {
    ...Typography.caption,
  },
});
