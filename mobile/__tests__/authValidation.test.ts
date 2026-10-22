import {
  hasErrors,
  validateEmail,
  validateLoginForm,
  validatePassword,
  validateRegisterForm,
} from '../src/features/auth/auth.validation';

describe('auth validation', () => {
  it('accepts a valid e-mail', () => {
    expect(validateEmail('atleta@ironmind.ai')).toBeUndefined();
  });

  it('rejects an invalid e-mail', () => {
    expect(validateEmail('atleta')).toBeDefined();
    expect(validateEmail('')).toBeDefined();
    expect(validateEmail('atleta@')).toBeDefined();
  });

  it('requires a password with at least 8 characters, a letter and a number', () => {
    expect(validatePassword('senha1234')).toBeUndefined();
    expect(validatePassword('senha12')).toBeDefined();
    expect(validatePassword('12345678')).toBeDefined();
    expect(validatePassword('senhasenha')).toBeDefined();
  });

  it('validates the login form', () => {
    const errors = validateLoginForm({ email: 'atleta@ironmind.ai', password: 'x' });

    expect(errors.email).toBeUndefined();
    expect(errors.password).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });

  it('validates the register form', () => {
    const errors = validateRegisterForm({
      name: 'A',
      email: 'invalido',
      password: '123',
      confirmPassword: '456',
    });

    expect(errors.name).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.confirmPassword).toBeDefined();
  });

  it('accepts a consistent register form', () => {
    const errors = validateRegisterForm({
      name: 'Alex Morgan',
      email: 'atleta@ironmind.ai',
      password: 'senha1234',
      confirmPassword: 'senha1234',
    });

    expect(hasErrors(errors)).toBe(false);
  });
});
