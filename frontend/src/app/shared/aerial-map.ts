import { Component } from '@angular/core';

@Component({
  selector: 'app-aerial-map',
  template: `
    <img
      class="h-full w-full object-cover"
      src="italy-960.webp"
      srcset="italy-640.webp 640w, italy-960.webp 960w, italy-1280.webp 1280w"
      sizes="(min-width: 1024px) 50vw, 100vw"
      width="960"
      height="1066"
      fetchpriority="high"
      alt=""
    />
  `,
  host: { class: 'absolute inset-0' },
})
export class AerialMap {}
