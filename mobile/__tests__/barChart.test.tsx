import { fireEvent, render, screen } from '@testing-library/react-native';

import { BarChart } from '../src/components/BarChart';

const POINTS = [
  { label: '18', value: 1820, accessibleValue: '1.820 kg' },
  { label: '19', value: 1950, accessibleValue: '1.950 kg' },
  { label: '20', value: 2310, accessibleValue: '2.310 kg' },
];

describe('BarChart', () => {
  it('renders a bar and a label for each point', async () => {
    await render(<BarChart points={POINTS} testID="chart" />);

    expect(screen.getByTestId('chart-bar-18')).toBeTruthy();
    expect(screen.getByTestId('chart-bar-19')).toBeTruthy();
    expect(screen.getByTestId('chart-bar-20')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
  });

  it('keeps values as text on the bar accessibility labels', async () => {
    await render(<BarChart points={POINTS} testID="chart" />);

    expect(screen.getByTestId('chart-bar-20').props.accessibilityLabel).toBe(
      '20: 2.310 kg'
    );
  });

  it('shows a permanent value bubble on the peak bar', async () => {
    await render(<BarChart points={POINTS} testID="chart" />);

    expect(screen.getByTestId('chart-peak-bubble')).toBeTruthy();
    expect(screen.getByTestId('chart-peak-bubble')).toHaveTextContent('2.310 kg');
  });

  it('reveals the value bubble of another bar on press and hides it again', async () => {
    await render(<BarChart points={POINTS} testID="chart" />);

    expect(screen.queryByText('1.820 kg')).toBeNull();

    await fireEvent.press(screen.getByTestId('chart-bar-18'));
    expect(screen.queryByText('1.820 kg')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('chart-bar-18'));
    expect(screen.queryByText('1.820 kg')).toBeNull();
  });
});
