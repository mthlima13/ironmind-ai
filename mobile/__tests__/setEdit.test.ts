import { parseEditedRpe } from '../src/features/workouts/setEdit';

describe('parseEditedRpe', () => {
  it('treats the empty value as "clear the RPE"', () => {
    expect(parseEditedRpe('')).toEqual({ valid: true, value: null });
    expect(parseEditedRpe('   ')).toEqual({ valid: true, value: null });
  });

  it('accepts the decimal separator typed as a comma', () => {
    expect(parseEditedRpe('8,5')).toEqual({ valid: true, value: 8.5 });
  });

  it('accepts the lower and upper limits of the scale', () => {
    expect(parseEditedRpe('1')).toEqual({ valid: true, value: 1 });
    expect(parseEditedRpe('10')).toEqual({ valid: true, value: 10 });
  });

  it('rejects values below 1, above 10 and non-numeric text', () => {
    expect(parseEditedRpe('0').valid).toBe(false);
    expect(parseEditedRpe('11').valid).toBe(false);
    expect(parseEditedRpe('-1').valid).toBe(false);
    expect(parseEditedRpe('abc').valid).toBe(false);
  });
});
