/**
 * Normalizes the RPE typed in the "Corrigir série" panel (SPEC 10.9).
 *
 * The correction follows the same contract as the registration: RPE is a
 * number from 1 to 10, and an empty value clears the field (null), matching
 * an omitted `perceivedExertion`.
 */
export type ParsedRpe =
  | { valid: true; value: number | null }
  | { valid: false };

export function parseEditedRpe(raw: string): ParsedRpe {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: true, value: null };
  }
  // Brazilian keyboards may type the decimal separator as a comma.
  const normalized = trimmed.replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10) {
    return { valid: false };
  }
  return { valid: true, value: parsed };
}
