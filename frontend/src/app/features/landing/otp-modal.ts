/**
 * Six digits, one box each.
 *
 * Typing advances, backspace on an empty box retreats, and a pasted code fills the row and
 * submits itself — which is what people actually do with a code they just copied out of an email.
 * The resend timer exists so the button cannot be hammered.
 *
 * @author Khova Krishna Pilato
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

import { isDemoMode } from '../../core/api/api.providers';
import { peekDemoOtp } from '../../core/api/mock/auth.mock';

const LENGTH = 6;
const RESEND_SECONDS = 45;

@Component({
  selector: 'bm-otp-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="modal modal-open backdrop-blur-sm" role="dialog" aria-modal="true">
      <div class="modal-box max-w-md rounded-box border border-hairline bg-base-100 p-8">
        <p class="bm-label">Step two</p>
        <h2 class="mt-2 text-2xl font-extrabold tracking-tight">Confirm your email</h2>
        <p class="mt-2 text-sm text-ink-2">
          We sent a six-digit code to
          <span class="font-semibold text-ink">{{ email() }}</span
          >.
        </p>

        @if (demoCode(); as hint) {
          <div class="alert alert-info alert-soft mt-4 py-2 text-xs">
            <span class="material-symbols-rounded text-[18px]">info</span>
            <span>
              There is no mailbox in the demo. Your code is
              <button type="button" class="link font-mono font-bold" (click)="fill(hint)">
                {{ hint }}
              </button>
            </span>
          </div>
        }

        <div class="mt-6 flex justify-between gap-2" (paste)="onPaste($event)">
          @for (slot of slots; track slot) {
            <input
              #box
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="1"
              [attr.aria-label]="'Digit ' + (slot + 1)"
              class="input input-bordered h-14 w-full max-w-[3.25rem] rounded-field p-0 text-center
                     font-mono text-xl font-semibold focus:border-primary focus:outline-none"
              [class.border-error]="error() !== null"
              [value]="digits()[slot]"
              (input)="onInput($event, slot)"
              (keydown)="onKeydown($event, slot)"
            />
          }
        </div>

        @if (error(); as message) {
          <p class="mt-3 text-center text-sm font-medium text-error">{{ message }}</p>
        }

        <button
          type="button"
          class="btn btn-primary mt-6 w-full rounded-field"
          [disabled]="!complete() || busy()"
          (click)="submit()"
        >
          @if (busy()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Verify and continue
        </button>

        <div class="mt-4 flex items-center justify-between text-xs text-ink-3">
          @if (countdown() > 0) {
            <span>Resend available in {{ countdown() }}s</span>
          } @else {
            <button type="button" class="link link-primary font-semibold" (click)="resend.emit()">
              Send a new code
            </button>
          }
          <button type="button" class="link" (click)="dismiss.emit()">Cancel</button>
        </div>
      </div>
      <button type="button" class="modal-backdrop" (click)="dismiss.emit()" aria-label="Close"></button>
    </div>
  `,
})
export class OtpModalComponent {
  readonly email = input.required<string>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly verify = output<string>();
  readonly resend = output<void>();
  readonly dismiss = output<void>();

  protected readonly slots = Array.from({ length: LENGTH }, (_, index) => index);
  protected readonly digits = signal<string[]>(Array(LENGTH).fill(''));
  protected readonly countdown = signal(RESEND_SECONDS);
  protected readonly complete = computed(() => this.digits().every((digit) => digit !== ''));

  /** Only ever populated in demo mode, where no email can actually be delivered. */
  protected readonly demoCode = signal<string | null>(isDemoMode ? peekDemoOtp() : null);

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  constructor() {
    const destroyRef = inject(DestroyRef);

    const timer = setInterval(() => {
      this.countdown.update((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    destroyRef.onDestroy(() => clearInterval(timer));

    // Focus the first box as soon as the row exists.
    effect(() => {
      const boxes = this.boxes();
      if (boxes.length > 0 && this.digits().every((digit) => digit === '')) {
        boxes[0].nativeElement.focus();
      }
    });

    // A fresh code after a resend replaces the hint.
    effect(() => {
      if (this.countdown() === RESEND_SECONDS && isDemoMode) {
        this.demoCode.set(peekDemoOtp());
      }
    });
  }

  protected onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);

    this.#write(index, digit);
    input.value = digit;

    if (digit && index < LENGTH - 1) {
      this.#focus(index + 1);
    }
    if (this.complete()) {
      this.submit();
    }
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      event.preventDefault();
      this.#write(index - 1, '');
      this.#focus(index - 1);
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      this.#focus(index - 1);
    }
    if (event.key === 'ArrowRight' && index < LENGTH - 1) {
      this.#focus(index + 1);
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) {
      return;
    }
    event.preventDefault();
    this.fill(pasted);
  }

  protected fill(code: string): void {
    const next = Array(LENGTH).fill('');
    code
      .slice(0, LENGTH)
      .split('')
      .forEach((digit, index) => (next[index] = digit));

    this.digits.set(next);
    this.boxes().forEach((box, index) => (box.nativeElement.value = next[index]));
    this.#focus(Math.min(code.length, LENGTH - 1));

    if (next.every((digit) => digit !== '')) {
      this.submit();
    }
  }

  protected submit(): void {
    if (this.complete() && !this.busy()) {
      this.verify.emit(this.digits().join(''));
    }
  }

  #write(index: number, digit: string): void {
    this.digits.update((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
  }

  #focus(index: number): void {
    this.boxes()[index]?.nativeElement.focus();
  }
}
