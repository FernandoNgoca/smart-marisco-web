import { AbstractControl, ValidationErrors } from '@angular/forms';

export const MAX_QUANTITY = 9999999.999;
export const QUANTITY_MESSAGE = 'Use uma quantidade entre 0,001 e 9 999 999,999, com até 3 casas decimais.';

export function quantityValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return { quantity: true };
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= MAX_QUANTITY
    && /^\d+(?:\.\d{1,3})?$/.test(String(number)) ? null : { quantity: true };
}
