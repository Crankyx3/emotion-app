import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ButtonStyles, Spacing, Typography, BorderRadius } from '../theme';

const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  // Variant styles
  const variantStyles = {
    primary: {
      container: {
        backgroundColor: Colors.primary,
        ...ButtonStyles.primary,
      },
      text: {
        color: Colors.textLight,
      },
    },
    secondary: {
      container: {
        backgroundColor: Colors.surfaceLight,
        ...ButtonStyles.secondary,
      },
      text: {
        color: Colors.text,
      },
    },
    outline: {
      container: {
        ...ButtonStyles.outline,
      },
      text: {
        color: Colors.primary,
      },
    },
    success: {
      container: {
        backgroundColor: Colors.success,
        ...ButtonStyles.primary,
      },
      text: {
        color: Colors.textLight,
      },
    },
    error: {
      container: {
        backgroundColor: Colors.error,
        ...ButtonStyles.primary,
      },
      text: {
        color: Colors.textLight,
      },
    },
    ghost: {
      container: {
        backgroundColor: 'transparent',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
      },
      text: {
        color: Colors.primary,
      },
    },
  };

  // Size styles
  const sizeStyles = {
    small: {
      container: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
      },
      text: {
        fontSize: 14,
      },
      icon: 18,
    },
    medium: {
      container: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
      },
      text: {
        fontSize: 16,
      },
      icon: 20,
    },
    large: {
      container: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxl,
      },
      text: {
        fontSize: 18,
      },
      icon: 24,
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.primary;
  const currentSize = sizeStyles[size] || sizeStyles.medium;

  const containerStyle = [
    styles.button,
    currentVariant.container,
    currentSize.container,
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const buttonTextStyle = [
    styles.text,
    currentVariant.text,
    currentSize.text,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={currentVariant.text.color}
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={currentSize.icon}
              color={currentVariant.text.color}
              style={styles.iconLeft}
            />
          )}
          <Text style={buttonTextStyle}>{children}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={currentSize.icon}
              color={currentVariant.text.color}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...Typography.bodyBold,
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
});

export default Button;
