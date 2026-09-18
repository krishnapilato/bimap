import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewEncapsulation,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * An email rendered the way a mail client would, and kept away from the application.
 *
 * The frame is sandboxed without scripts: markup in a message can style itself but can never run
 * code, submit forms or reach the page around it. Same-origin access is kept so the frame can grow
 * to the height of its content, and so a changing draft is rewritten in place rather than reloaded,
 * which would blank the preview on every keystroke.
 */
@Component({
  selector: 'bm-mail-frame',
  template: `
    <iframe
      #frame
      class="bm-mail-frame__iframe"
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerpolicy="no-referrer"
      [title]="label()"
      [style.height.px]="height()"
      (load)="loaded()"
    ></iframe>
  `,
  styles: `
    .bm-mail-frame { display: block; min-width: 0; }
    .bm-mail-frame__iframe {
      display: block; width: 100%; border: 0; background: #f4f7fb;
      transition: height var(--bm-duration-slow) var(--bm-ease-emphasized);
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-mail-frame' },
})
export class MailFrame {
  /** The complete document, from `campaignDocument` or `messageDocument`. */
  readonly html = input.required<string>();
  readonly label = input('Email preview');
  readonly minHeight = input(240);

  private readonly frame = viewChild.required<ElementRef<HTMLIFrameElement>>('frame');
  protected readonly height = signal(240);
  private ready = false;
  private observer?: ResizeObserver;

  constructor() {
    effect(() => {
      const frame = this.frame().nativeElement;
      const html = this.html();
      const document = frame.contentDocument;
      if (this.ready && document) {
        document.open();
        document.write(html);
        document.close();
        this.measure();
      } else {
        frame.srcdoc = html;
      }
    });
    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }

  protected loaded(): void {
    this.ready = true;
    this.measure();
  }

  private measure(): void {
    const document = this.frame().nativeElement.contentDocument;
    if (!document?.body) return;
    const fit = () => this.height.set(Math.max(this.minHeight(), Math.ceil(document.documentElement.scrollHeight)));
    fit();
    this.observer?.disconnect();
    this.observer = new ResizeObserver(fit);
    this.observer.observe(document.body);
    // Images arrive after the document is parsed, and each one may change the height again.
    for (const image of Array.from(document.images)) image.addEventListener('load', fit, { once: true });
  }
}
