import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let toast: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    toast = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides the message after three seconds', () => {
    toast.show('Saved.');
    expect(toast.message()).toBe('Saved.');
    vi.advanceTimersByTime(3000);
    expect(toast.message()).toBe('');
  });

  it('restarts the timer when a new message arrives', () => {
    toast.show('First.');
    vi.advanceTimersByTime(2000);
    toast.show('Second.');
    vi.advanceTimersByTime(2000);
    expect(toast.message()).toBe('Second.');
  });
});
