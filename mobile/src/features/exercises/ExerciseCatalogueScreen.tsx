import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { useTheme, useThemedStyles, spacing } from '../../theme';
import type { ExerciseFilters } from '../../types/exercise';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExerciseList } from './ExerciseList';

/**
 * Catalogue of exercises moved out of the Treinos listing.
 *
 * The Treinos tab now separates discovery from the programs, while the
 * catalogue — including the creation of personal exercises — stays reachable
 * from the header action, preserving the existing feature (SPEC 15.1).
 */
export function ExerciseCatalogueScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [filters, setFilters] = useState<ExerciseFilters>({
    search: '',
    muscleGroup: 'ALL',
  });
  const [isCreateExerciseOpen, setIsCreateExerciseOpen] = useState(false);

  return (
    <Screen
      title="Exercícios"
      subtitle="Busque no catálogo ou crie um exercício só para a sua conta."
      testID="exercise-catalogue-screen"
    >
      <View style={styles.section}>
        <Button
          label={
            isCreateExerciseOpen
              ? 'Fechar formulário'
              : 'Criar exercício personalizado'
          }
          variant="secondary"
          icon={<Ionicons name="add-circle-outline" size={18} color={colors.accent} />}
          onPress={() => setIsCreateExerciseOpen((current) => !current)}
          testID="toggle-custom-exercise-form"
        />

        {isCreateExerciseOpen ? (
          <Card
            title="Novo exercício"
            subtitle="O exercício fica disponível apenas para a sua conta."
          >
            <CustomExerciseForm onCreated={() => setIsCreateExerciseOpen(false)} />
          </Card>
        ) : null}

        <ExerciseList filters={filters} onChangeFilters={setFilters} />
      </View>
    </Screen>
  );
}

const createStyles = () => StyleSheet.create({
  section: {
    gap: spacing.md,
  },
});
