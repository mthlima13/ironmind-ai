import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { useThemedStyles, spacing, typography, type ThemeColors } from '../theme';

export type OptionRowOption<T extends string> = {
  value: T;
  label: string;
};

export type OptionRowProps<T extends string> = {
  label: string;
  options: OptionRowOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID: string;
};

/**
 * A labeled row of mutually exclusive choice buttons (SPEC 15.2).
 *
 * The active option renders in the accent color; every option keeps a touch
 * target of at least 44 pt and the row reflows on narrow screens.
 */
export function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
  testID,
}: OptionRowProps<T>) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.group} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <Button
              key={option.value}
              label={option.label}
              variant={isActive ? 'primary' : 'secondary'}
              onPress={() => onChange(option.value)}
              testID={`${testID}-${option.value}`}
              style={styles.optionButton}
            />
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    group: {
      gap: spacing.sm,
    },
    label: {
      ...typography.label,
      color: _colors.textMuted,
    },
    options: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    optionButton: {
      flexGrow: 1,
      flexBasis: 96,
    },
  });
