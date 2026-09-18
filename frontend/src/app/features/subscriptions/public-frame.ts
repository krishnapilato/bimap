import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * The page around everything reached from an email by someone who may have no account: the brand,
 * one card in the middle of a quiet background, and a line saying where the page came from.
 */
@Component({
  selector: 'bm-public-frame',
  template: `
    <div class="public__backdrop" aria-hidden="true">
      <span class="public__glow is-one"></span>
      <span class="public__glow is-two"></span>
    </div>
    <main class="public__main">
      <div class="public__brand">
        <span class="bm-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" />
            <circle class="bm-brand-mark__ring" cx="16" cy="16" r="7.25" />
            <path class="bm-brand-mark__ticks" d="M16 5.5v4M16 22.5v4M5.5 16h4M22.5 16h4" />
            <circle class="bm-brand-mark__dot" cx="16" cy="16" r="2.6" />
          </svg>
        </span>
        <span class="public__wordmark">BiMap</span>
      </div>
      <section class="public__card">
        <ng-content />
      </section>
      <p class="public__foot">Mailing lists of the BiMap cadastral registry. Nothing here needs an account.</p>
    </main>
  `,
  styles: `
    .bm-public-frame { position: relative; display: grid; min-height: 100dvh; overflow: hidden; background: var(--bm-canvas); }
    .public__backdrop {
      position: absolute; inset: 0; pointer-events: none;
      background-image: radial-gradient(circle at 1px 1px, rgba(11, 23, 38, 0.07) 1px, transparent 0);
      background-size: 22px 22px;
      mask-image: radial-gradient(ellipse at 50% 40%, #000 20%, transparent 75%);
    }
    .public__glow { position: absolute; width: 520px; height: 520px; border-radius: 50%; filter: blur(80px); opacity: 0.5; animation: public-drift 18s ease-in-out infinite alternate; }
    .public__glow.is-one { top: -180px; left: -120px; background: #cfe0ff; }
    .public__glow.is-two { right: -160px; bottom: -200px; background: #ffe3c7; animation-delay: -9s; }
    @keyframes public-drift { to { transform: translate3d(calc(60px * var(--bm-motion)), calc(40px * var(--bm-motion)), 0) scale(1.08); } }
    .bm-reduced-motion .public__glow { animation: none; }
    .public__main { position: relative; display: grid; align-content: center; justify-items: center; gap: 22px; padding: 40px 16px; }
    .public__brand { display: inline-flex; align-items: center; gap: 10px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; }
    .public__wordmark { font: 700 19px/1 var(--bm-font-sans); letter-spacing: -0.03em; color: var(--bm-text); }
    .public__card {
      width: min(460px, 100%); padding: 32px 30px; border: 1px solid var(--bm-border); border-radius: var(--bm-radius-2xl);
      background: rgba(255, 255, 255, 0.94); box-shadow: var(--bm-shadow-xl);
      backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
      animation: public-card-in 700ms var(--bm-ease-emphasized) 80ms both;
    }
    @media (max-width: 600px) { .public__card { padding: 26px 20px; border-radius: var(--bm-radius-xl); } }
    @keyframes public-card-in { from { opacity: 0; transform: translate3d(0, calc(16px * var(--bm-motion)), 0) scale(calc(1 - 0.02 * var(--bm-motion))); } }
    .public__foot { max-width: 46ch; font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); text-align: center; animation: bm-fade var(--bm-duration-slow) var(--bm-ease-standard) 300ms both; }

    .public-page { display: grid; gap: 16px; }
    .public-page__icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; background: var(--bm-accent-soft); color: var(--bm-accent); animation: bm-pop 420ms var(--bm-ease-spring) 200ms both; }
    .public-page__icon[data-tone='positive'] { background: var(--bm-positive-soft); color: var(--bm-positive); }
    .public-page__icon[data-tone='critical'] { background: var(--bm-critical-soft); color: var(--bm-critical); }
    .public-page__icon[data-tone='neutral'] { background: var(--bm-neutral-soft); color: var(--bm-neutral); }
    .public-page__title { font: var(--bm-text-title); letter-spacing: var(--bm-tracking-tight); }
    .public-page__text { font: var(--bm-text-body); color: var(--bm-text-2); }
    .public-page__text strong { color: var(--bm-text); font-weight: 650; }
    .public-page__form { display: grid; gap: 14px; margin-top: 4px; }
    .public-page__row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    @media (max-width: 480px) { .public-page__row { grid-template-columns: minmax(0, 1fr); } }
    .public-page__actions { display: grid; gap: 8px; margin-top: 4px; }
    .public-page__actions .bm-button { justify-content: center; }
    .public-page__fine { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    .public-page__error { margin-top: -6px; font: var(--bm-text-caption); font-weight: 600; color: var(--bm-negative); }
    .public-page__done { justify-self: center; width: 72px; height: 72px; }
    .public-page__done svg { width: 100%; height: 100%; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .public-page__done circle { fill: var(--bm-positive-soft); stroke: var(--bm-positive); stroke-width: 2; stroke-dasharray: 151; stroke-dashoffset: 151; transform: rotate(-90deg); transform-origin: center; animation: public-draw 700ms var(--bm-ease-emphasized) 120ms forwards; }
    .public-page__done path { stroke: var(--bm-positive); stroke-width: 3.5; stroke-dasharray: 34; stroke-dashoffset: 34; animation: public-draw 420ms var(--bm-ease-emphasized) 660ms forwards; }
    @keyframes public-draw { to { stroke-dashoffset: 0; } }
    .public-page.is-centred { justify-items: center; text-align: center; }
    .public-page__list { display: grid; gap: 2px; padding: 12px 14px; border-radius: var(--bm-radius-md); background: var(--bm-surface-2); }
    .public-page__list strong { font: var(--bm-text-subheading); }
    .public-page__list span { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bm-public-frame' },
})
export class PublicFrame {}
