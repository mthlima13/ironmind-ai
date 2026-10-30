import { useLocalSearchParams } from 'expo-router';

import {
  ProgramDetailsScreen,
  type ProgramDetailsSource,
} from '../../src/features/programs/ProgramDetailsScreen';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Details of a saved program or of a catalogue template.
 *
 * `source=saved` is assumed when the parameter is missing, because that is the
 * only kind of program whose identifier is persisted by the backend.
 */
export default function ProgramDetailsRoute() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    source?: string | string[];
  }>();

  const programId = first(params.id) ?? '';
  const source: ProgramDetailsSource =
    first(params.source) === 'template' ? 'template' : 'saved';

  return <ProgramDetailsScreen programId={programId} source={source} />;
}
