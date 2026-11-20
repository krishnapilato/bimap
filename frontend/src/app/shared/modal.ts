import { afterRenderEffect, Directive, ElementRef, inject, input } from '@angular/core';

/** Native modal dialogs supply focus trapping, background inertness and focus restoration. */
@Directive({ selector: 'dialog[appModal]' })
export class Modal {
  readonly appModal = input.required<boolean>();
  private readonly element = inject<ElementRef<HTMLDialogElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.element.nativeElement;
      if (this.appModal() && !dialog.open) dialog.showModal();
      else if (!this.appModal() && dialog.open) dialog.close();
    });
  }
}
