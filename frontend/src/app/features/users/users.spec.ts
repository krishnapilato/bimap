import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../shared/toast.service';
import { Users } from './users';
import { User } from './user.models';
import { UsersService } from './users.service';

describe('Users workflows', () => {
  let fixture: ComponentFixture<Users>;
  let host: HTMLElement;
  const service = { findAll: vi.fn(), delete: vi.fn(), update: vi.fn(), save: vi.fn() };
  const accounts: User[] = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1, name: 'User', surname: String.fromCodePoint(65 + i), email: `user${i + 1}@example.com`, role: 'USER', enabled: true,
  }));

  beforeEach(async () => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
    service.findAll.mockReturnValue(of(accounts));
    service.delete.mockReturnValue(of(null));
    await TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: UsersService, useValue: service },
      { provide: AuthService, useValue: { user: signal({ id: 1 }), isAdmin: () => true } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(Users);
    host = fixture.nativeElement as HTMLElement;
    await settle();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  async function settle() { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }
  function button(label: string) {
    const found = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.trim() === label);
    if (!found) throw new Error(`Missing button: ${label}`);
    return found;
  }

  async function deleteLastUser() {
    button('Next').click();
    await settle();
    const remove = host.querySelector<HTMLButtonElement>('button[title="Delete"]');
    if (!remove) throw new Error('Missing delete action');
    remove.click();
    await settle();
    const confirm = host.querySelector<HTMLButtonElement>('dialog[aria-labelledby="delete-title"] .btn-error');
    if (!confirm) throw new Error('Missing confirmation');
    confirm.click();
    await settle();
  }

  it('moves back to a valid page after deleting its final row', async () => {
    service.findAll.mockReturnValue(of(accounts.slice(0, 5)));
    await deleteLastUser();
    expect(host.textContent).toContain('Page 1 of 1');
    expect(host.textContent).toContain('User A');
  });

  it('keeps failed deletion open and explains the server conflict', async () => {
    service.delete.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { detail: 'The last active administrator cannot be removed.' } })));
    await deleteLastUser();
    const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-labelledby="delete-title"]');
    expect(dialog?.open).toBe(true);
    expect(dialog?.textContent).toContain('The last active administrator cannot be removed.');
  });

  it('opens an accessible native dialog and closes it on Escape', async () => {
    button('New user').click();
    await settle();
    const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-labelledby="user-form-title"]');
    expect(dialog?.open).toBe(true);
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));
    await settle();
    expect(dialog?.open).toBe(false);
  });

  it('allows editing a user without entering a replacement password', async () => {
    host.querySelector<HTMLButtonElement>('button[title="Edit"]')?.click();
    await settle();
    expect(button('Save changes').disabled).toBe(false);
  });
});
