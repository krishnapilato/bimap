import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostAttributeToken,
  Renderer2,
  ViewEncapsulation,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';

import { ICONS } from './icon-set';

/**
 * A Lucide icon drawn inline: `<svg lucideIcon="map-pin" [size]="16">`.
 *
 * The drawings come from `icon-set.ts`, which imports only the icons this app uses, so the bundle
 * carries those and nothing else. Icons are decoration unless the element is given a label.
 */
@Component({
  selector: 'svg[lucideIcon]',
  template: '',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'bm-icon',
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[attr.stroke-width]': 'strokeWidth()',
    '[attr.aria-hidden]': 'labelled ? null : "true"',
    '[attr.role]': 'labelled ? "img" : null',
  },
})
export class Icon {
  readonly lucideIcon = input.required<string>();
  readonly size = input<number | string>(18);
  readonly strokeWidth = input<number | string>(1.75);

  protected readonly labelled = inject(new HostAttributeToken('aria-label'), { optional: true }) !== null;

  constructor() {
    const host = inject<ElementRef<SVGSVGElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);

    effect(() => {
      const name = this.lucideIcon();
      const node = ICONS[name];
      if (!node && isDevMode()) console.warn(`The icon "${name}" is not in icon-set.ts.`);
      while (host.firstChild) renderer.removeChild(host, host.firstChild);
      for (const [tag, attributes] of node ?? []) {
        const child = renderer.createElement(tag, 'svg');
        for (const [attribute, value] of Object.entries(attributes)) {
          if (value !== undefined) renderer.setAttribute(child, attribute, String(value));
        }
        renderer.appendChild(host, child);
      }
    });
  }
}
