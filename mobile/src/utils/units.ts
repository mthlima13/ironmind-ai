import type { WeightUnit } from '../types/user';

/** Canonical storage unit is the kilogram (SPEC 7.2). */
export const KG_PER_LB = 0.45359237;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Converts a value stored in kg to the unit the user wants to see. */
export function toDisplayWeight(kg: number | null, unit: WeightUnit): number | null {
  if (kg === null) {
    return null;
  }
  return unit === 'LB' ? kgToLb(kg) : kg;
}

/** Converts a value typed by the user back to the canonical unit (kg). */
export function fromDisplayWeight(value: number | null, unit: WeightUnit): number | null {
  if (value === null) {
    return null;
  }
  return unit === 'LB' ? lbToKg(value) : value;
}

export function formatWeight(
  kg: number | null,
  unit: WeightUnit,
  options: { withUnit?: boolean } = {}
): string {
  if (kg === null) {
    return options.withUnit ? `— ${unit.toLowerCase()}` : '—';
  }
  const value = toDisplayWeight(kg, unit);
  if (value === null) {
    return '—';
  }
  const rounded = Math.round(value * 10) / 10;
  const text = String(rounded);
  return options.withUnit ? `${text} ${unit.toLowerCase()}` : text;
}

/** Rounds the canonical value to the precision accepted by the backend. */
export function roundKg(kg: number): number {
  return Math.round(kg * 100) / 100;
}
