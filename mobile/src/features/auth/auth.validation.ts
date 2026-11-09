/**
 * Form validation of the first-run onboarding (SPEC 15.3).
 *
 * There is no account anymore, so the only local rule is the name asked by
 * the "Quem é você?" step: the backend receives no form data on boot.
 */

export type NameFormValues = {
  name: string;
};

export type AuthFieldErrors = Partial<Record<'name', string>>;

/** Maximum length accepted by the forms ("Perfil", "Quem é você?"). */
export const MAX_NAME_LENGTH = 120;

export function validateNameForm(values: NameFormValues): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const name = values.name.trim();

  if (!name) {
    errors.name = 'Informe seu nome.';
  } else if (name.length < 2) {
    errors.name = 'Informe pelo menos 2 caracteres.';
  }

  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
