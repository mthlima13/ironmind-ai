/**
 * Form validation for the authentication screens (SPEC RF-001 and RNF-004).
 *
 * The same rules run in the app and in the API: the app validates to give
 * fast feedback, the backend validates to guarantee the contract.
 */

export const MIN_PASSWORD_LENGTH = 8;

export type LoginFormValues = {
  email: string;
  password: string;
};

export type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type AuthFieldErrors = Partial<Record<keyof RegisterFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) {
    return 'Informe seu e-mail.';
  }
  if (!EMAIL_PATTERN.test(value)) {
    return 'Informe um e-mail válido.';
  }
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return 'Informe sua senha.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return 'A senha precisa conter ao menos uma letra.';
  }
  if (!/\d/.test(password)) {
    return 'A senha precisa conter ao menos um número.';
  }
  return undefined;
}

export function validateLoginPassword(password: string): string | undefined {
  if (!password) {
    return 'Informe sua senha.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return undefined;
}

export function validateLoginForm(values: LoginFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validateLoginPassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

export function validateRegisterForm(values: RegisterFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = 'Informe seu nome.';
  } else if (values.name.trim().length < 2) {
    errors.name = 'Informe pelo menos 2 caracteres.';
  }

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirme sua senha.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'As senhas não conferem.';
  }

  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/** Validation of the "esqueci minha senha" form (SPEC RF-001). */
export function validateForgotPasswordForm(values: {
  email: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
}

/** Validation of the "definir nova senha" form (SPEC RF-001). */
export function validateResetPasswordForm(values: {
  password: string;
  confirmPassword: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};

  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirme sua senha.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'As senhas não conferem.';
  }

  return errors;
}
