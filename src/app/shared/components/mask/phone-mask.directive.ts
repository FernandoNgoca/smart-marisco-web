import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appPhoneMask]'
})
export class PhoneMaskDirective {

  constructor(
    private el: ElementRef,
    private control: NgControl
  ) {}

  @HostListener('input', ['$event'])
  onInput(event: any): void {

    // 1. remover tudo que não é número
    let value = event.target.value.replace(/\D/g, '');

    // 2. limitar a 9 dígitos
    value = value.substring(0, 9);

    // 3. guardar valor limpo no formControl
    this.control.control?.setValue(value, { emitEvent: false });

    // 4. aplicar formatação visual
    const formatted = this.format(value);

    // 5. atualizar input visual
    this.el.nativeElement.value = formatted;
  }

  private format(value: string): string {
    if (!value) return '';

    if (value.length <= 2) {
      return value;
    }

    if (value.length <= 5) {
      return `${value.substring(0, 2)} ${value.substring(2)}`;
    }

    return `${value.substring(0, 2)} ${value.substring(2, 5)} ${value.substring(5)}`;
  }
}