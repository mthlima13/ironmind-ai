import {
  hasErrors,
  validateNameForm,
} from '../src/features/auth/auth.validation';

/** The only form of the onboarding left is "Quem é você?" (SPEC 15.3). */
describe('onboarding validation', () => {
  it('accepts a name with two characters or more', () => {
    expect(validateNameForm({ name: 'Alex Morgan' })).toEqual({});
    expect(validateNameForm({ name: '  Ly  ' })).toEqual({});
  });

  it('requires a name', () => {
    const errors = validateNameForm({ name: '   ' });
    expect(errors.name).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it('requires at least two characters', () => {
    const errors = validateNameForm({ name: 'A' });
    expect(errors.name).toBeDefined();
  });
});
