// Design System - Einheitliches Styling für die gesamte App

export const Colors = {
  // Primary Colors
  primary: '#007AFF',
  primaryLight: '#E3F2FD',
  primaryDark: '#0056B3',

  // Status Colors
  success: '#34a853',
  successLight: '#E8F5E9',
  warning: '#fbbc05',
  warningLight: '#FFF9DB',
  error: '#E03131',
  errorLight: '#FFEBEE',
  info: '#a142f4',
  infoLight: '#F3E5F5',

  // Backgrounds
  background: '#EAF4FF',
  backgroundAlt: '#F6FBFF',
  surface: '#FFFFFF',
  surfaceLight: '#F7F9FC',

  // Text Colors
  text: '#1C1C1E',
  textSecondary: '#666666',
  textMuted: '#8E8E93',
  textLight: '#FFFFFF',

  // Borders & Dividers
  border: '#E5E5EA',
  borderLight: '#F2F2F7',
  divider: '#E0E0E0',

  // Special
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',

  // Streak/Orange accent
  streak: '#FF6B35',
  streakLight: '#FFF5E5',
  streakBorder: '#FFD280',
};

export const Spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const Typography = {
  // Headings
  h1: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    color: Colors.text,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    color: Colors.text,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: Colors.text,
  },
  h4: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
    color: Colors.text,
  },

  // Body
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 26,
    color: Colors.text,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 26,
    color: Colors.text,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 26,
    color: Colors.text,
  },

  // Small/Caption
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  captionBold: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  small: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
    color: Colors.textMuted,
  },
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 50,
};

export const Shadows = {
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const CardStyles = {
  base: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  compact: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.small,
  },
  elevated: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.large,
  },
};

export const ButtonStyles = {
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    ...Shadows.small,
  },
  secondary: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
};

// Utility function for consistent spacing
export const spacing = (...values) => {
  return values.map(v => Spacing[v] || v).join(' ');
};
