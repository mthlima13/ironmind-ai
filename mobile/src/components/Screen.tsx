import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemedStyles, layout, spacing, typography, type ThemeColors } from '../theme';

export type ScreenProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Rendered between the header and the content. */
  headerAction?: ReactNode;
  scroll?: boolean;
  /**
   * Keeps the focused field above the keyboard. Enabled on every form
   * (SPEC 15.5 - keyboard).
   */
  avoidKeyboard?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Base screen of the app.
 *
 * It applies the safe area insets so the content is never drawn under the
 * system bars, which is mandatory with edge-to-edge on Android 15
 * (SPEC 15.5).
 */
export function Screen({
  children,
  title,
  subtitle,
  headerAction,
  scroll = true,
  avoidKeyboard = false,
  style,
  testID,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);

  const content = (
    <View
      style={[
        styles.content,
        {
          paddingLeft: insets.left + layout.screenPadding,
          paddingRight: insets.right + layout.screenPadding,
          paddingBottom: insets.bottom + spacing.xl,
        },
        style,
      ]}
    >
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {headerAction}
        </View>
      ) : null}
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
      testID={testID}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={insets.top}
          style={styles.container}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
