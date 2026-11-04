import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { disabled, email, form, FormField, FormRoot, maxLength, minLength, required, validate } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Navbar } from '../../shared/navbar';
import { listOf } from '../../shared/resource';
import { ToastService } from '../../shared/toast.service';
import { Role, ROLES, User } from './user.models';
import { UsersService } from './users.service';
import { apiError } from '../../shared/api-error';
import { Modal } from '../../shared/modal';
import { pageIndex } from '../../shared/pagination';
import { passwordError } from '../../shared/validation';

const PAGE_SIZE = 5;
const EMPTY = { name: '', surname: '', email: '', password: '', role: 'USER' as Role, enabled: true };

@Component({
  selector: 'app-users',
  imports: [FormField, FormRoot, Navbar, Modal],
  templateUrl: './users.html',
})
export class Users {
  private readonly userService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly roles = ROLES;

  protected readonly users = rxResource({ stream: () => this.userService.findAll(), defaultValue: [] });
  private readonly accounts = listOf(this.users);
  protected readonly query = signal('');
  private readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.accounts().filter((user) => `${user.name} ${user.surname} ${user.email}`.toLowerCase().includes(query));
  });
  protected readonly total = computed(() => this.matches().length);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly page = pageIndex(this.query, this.pages);
  protected readonly visible = computed(() => this.matches().slice(this.page() * PAGE_SIZE, (this.page() + 1) * PAGE_SIZE));

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<User | null>(null);
  protected readonly deleting = signal<User | null>(null);
  protected readonly emailing = signal<User | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');

  private readonly account = signal({ ...EMPTY });
  protected readonly form = form(
    this.account,
    (account) => {
      required(account.name);
      required(account.surname);
      required(account.email);
      maxLength(account.name, 100);
      maxLength(account.surname, 100);
      maxLength(account.email, 256);
      email(account.email);
      required(account.password, { when: () => !this.editing() });
      minLength(account.password, 8);
      validate(account.password, ({ value }) => passwordError(value()));
      disabled(account.enabled, { when: () => this.editing()?.id === this.auth.user()?.id });
    },
    { submission: { action: () => this.save() } },
  );

  protected openForm(user: User | null = null): void {
    this.editing.set(user);
    this.account.set(user ? { name: user.name, surname: user.surname, email: user.email, password: '', role: user.role, enabled: user.enabled } : { ...EMPTY });
    this.form().reset();
    this.error.set('');
    this.formOpen.set(true);
  }

  protected close(): void {
    if (this.busy() || this.form().submitting()) return;
    this.formOpen.set(false);
    this.deleting.set(null);
    this.emailing.set(null);
  }

  protected cancel(event: Event): void {
    event.preventDefault();
    this.close();
  }

  protected async remove(user: User): Promise<void> {
    await this.run(this.userService.delete(user.id), `${user.name} ${user.surname} was deleted.`);
  }

  protected async sendWelcomeEmail(user: User): Promise<void> {
    await this.run(this.userService.sendWelcomeEmail(user.id), `Welcome email sent to ${user.email}.`);
  }

  private async save(): Promise<undefined> {
    const { password, ...user } = this.account();
    const request = { ...user, password: password || null };
    const editing = this.editing();
    try {
      const saved = await firstValueFrom(editing ? this.userService.update(request, editing.id) : this.userService.save(request));
      this.formOpen.set(false);
      if (saved.id === this.auth.user()?.id) {
        if (password) {
          this.auth.logout('Your password changed. Sign in again.');
          return undefined;
        }
        this.auth.updateUser(saved);
        if (!this.auth.isAdmin()) {
          await this.router.navigate(['/assets']);
          return undefined;
        }
      }
      this.users.reload();
      this.toast.show(editing ? 'Changes saved.' : `${user.name} ${user.surname} was added.`);
    } catch (error) {
      this.error.set(apiError(error, error instanceof HttpErrorResponse && error.status === 409 ? 'This email is already registered.' : 'Could not save the user. Try again.'));
    }
    return undefined;
  }

  private async run(request: Observable<unknown>, success: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await firstValueFrom(request);
      this.users.reload();
      this.toast.show(success);
      this.deleting.set(null);
      this.emailing.set(null);
    } catch (error) {
      this.error.set(apiError(error, 'Something went wrong. Try again.'));
    } finally {
      this.busy.set(false);
    }
  }
}
