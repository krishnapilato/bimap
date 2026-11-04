import { afterNextRender, Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, ElementRef, inject } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-landmark-gallery',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: '<bimap-landmarks [attr.data-api]="photoApi"><p class="grid h-full place-items-center p-8 text-center text-stone-600" role="status">Loading heritage photographs…</p></bimap-landmarks>',
  host: { class: 'absolute inset-0' },
})
export class LandmarkGallery {
  protected readonly photoApi = environment.heritagePhotoApi;
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      if (customElements.get('bimap-landmarks') || document.querySelector('script[data-landmark-gallery]')) return;
      const script = document.createElement('script');
      script.dataset['landmarkGallery'] = '';
      script.src = new URL('landmarks/gallery.js', document.baseURI).href;
      script.onerror = () => {
        script.remove();
        if (!this.destroyRef.destroyed) {
          const message = this.element.nativeElement.querySelector('p');
          if (message) message.textContent = 'Photographs could not load. Refresh the page to try again.';
        }
      };
      document.head.append(script);
    });
  }
}
