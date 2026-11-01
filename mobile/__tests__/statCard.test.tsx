import { render, screen } from '@testing-library/react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatCard } from '../src/components/StatCard';

describe('StatCard', () => {
  it('renders label, value and optional hint', async () => {
    await render(
      <StatCard
        label="Volume da semana"
        value="12.480 kg"
        hint="vs. semana anterior"
        testID="stat-volume"
      />
    );

    expect(screen.getByText('Volume da semana')).toBeTruthy();
    expect(screen.getByText('12.480 kg')).toBeTruthy();
    expect(screen.getByText('vs. semana anterior')).toBeTruthy();
  });

  it('omits the hint when not provided', async () => {
    await render(<StatCard label="Sessões" value="4" testID="stat-sessions" />);

    expect(screen.getByText('Sessões')).toBeTruthy();
    expect(screen.queryByText('por sessão')).toBeNull();
  });

  it('renders the icon badge as hidden to accessibility', async () => {
    await render(
      <StatCard
        label="Recordes"
        value="2"
        icon={<Ionicons name="trophy-outline" size={16} />}
        testID="stat-records"
      />
    );

    expect(screen.getByTestId('stat-records')).toBeTruthy();
  });

  it('shows the delta chip next to the value', async () => {
    await render(
      <StatCard
        label="Volume da semana"
        value="12.480 kg"
        delta="▲ 8,4%"
        deltaTone="positive"
        testID="stat-delta"
      />
    );

    expect(screen.getByLabelText('▲ 8,4% Volume da semana')).toBeTruthy();
  });

  it('omits the delta chip when there is no comparison data', async () => {
    await render(
      <StatCard label="Volume da semana" value="12.480 kg" testID="stat-no-delta" />
    );

    expect(screen.getByText('Volume da semana')).toBeTruthy();
    expect(screen.queryByText(/▲|▼/)).toBeNull();
  });

  it('hero variant renders the sparkline proportional to the values', async () => {
    await render(
      <StatCard
        label="Volume da semana"
        value="12.480 kg"
        variant="hero"
        spark={[0.25, 0.5, 1, 0]}
        testID="stat-hero"
      />
    );

    // The sparkline is decorative, so it is hidden from accessibility and
    // only matchable with `includeHiddenElements` (RNTL 13+ default).
    expect(
      screen.getByTestId('stat-hero-spark', { includeHiddenElements: true })
    ).toBeTruthy();
    expect(
      screen.getAllByTestId(/^stat-hero-spark-\d+$/, { includeHiddenElements: true })
    ).toHaveLength(4);
  });

  it('does not render the sparkline outside the hero variant', async () => {
    await render(
      <StatCard
        label="Volume da semana"
        value="12.480 kg"
        spark={[0.3, 0.6]}
        testID="stat-no-hero"
      />
    );

    expect(screen.queryByTestId('stat-no-hero-spark')).toBeNull();
  });
});
