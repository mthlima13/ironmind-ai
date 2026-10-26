import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, useThemedStyles, layout, radii, spacing, typography, type ThemeColors } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `lg` is used for the primary action during a workout. */
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: import('react-native').AccessibilityState;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const isDisabled = disabled || loading;

  const variantBackground: Record<ButtonVariant, string> = {
    primary: colors.accent,
    secondary: colors.surfaceElevated,
    ghost: 'transparent',
    danger: colors.danger,
  };
  const variantText: Record<ButtonVariant, string> = {
    primary: colors.onAccent,
    secondary: colors.text,
    ghost: colors.accent,
    danger: colors.onAccent,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading, ...(accessibilityState ?? {}) }}
      testID={testID}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.large : styles.medium,
        variant === 'primary'
          ? styles.primary
          : { backgroundColor: variantBackground[variant] },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        fullWidth && styles.fullWidth,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.accent, colors.accentPressed]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={variantText[variant]} size="small" />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <Text
            style={[styles.label, { color: variantText[variant] }]}
            numberOfLines={2}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.6}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radii.md,
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  medium: {
    paddingVertical: spacing.md,
  },
  large: {
    minHeight: 56,
    paddingVertical: spacing.lg,
  },
  primary: {
    backgroundColor: 'transparent',
  },
  secondary: {
    borderColor: colors.border,
    borderWidth: 1,
  },
  ghost: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  fullWidth: {
    width: '100%',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodyStrong,
    textAlign: 'center',
    flexShrink: 1,
  },
});
