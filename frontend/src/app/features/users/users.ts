import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { disabled, email, form, FormField, FormRoot, minLength, required } from '@angular/forms/signals';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { Navbar } from '../../shared/navbar';
import { listOf } from '../../shared/resource';
import { ToastService } from '../../shared/toast.service';
import { Role, ROLES, User } from './user.models';
import { UsersService } from './users.service';

const PAGE_SIZE = 5;
const EMPTY = { name: '', surname: '', email: '', password: '', role: 'USER' as Role, enabled: true };

@Component({
  selector: 'app-users',
  imports: [FormField, FormRoot, Navbar],
  templateUrl: './users.html',
  host: { '(document:keydown.escape)': 'close()' },
})
export class Users {
  private readonly userService = inject(UsersService);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);
  protected readonly roles = ROLES;

  protected readonly users = rxResource({ stream: () => this.userService.findAll(), defaultValue: [] });
  private readonly accounts = listOf(this.users);
  protected readonly query = signal('');
  protected readonly page = linkedSignal({ source: this.query, computation: () => 0 });
  private readonly matches = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.accounts().filter((user) => `${user.name} ${user.surname} ${user.email}`.toLowerCase().includes(query));
  });
  protected readonly total = computed(() => this.matches().length);
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
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
      email(account.email);
      required(account.password, { when: () => !this.editing() });
      minLength(account.password, 8);
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
    this.formOpen.set(false);
    this.deleting.set(null);
    this.emailing.set(null);
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
      await firstValueFrom(editing ? this.userService.update(request, editing.id) : this.userService.save(request));
      this.formOpen.set(false);
      this.users.reload();
      this.toast.show(editing ? 'Changes saved.' : `${user.name} ${user.surname} was added.`);
    } catch (error) {
      this.error.set((error as HttpErrorResponse).status === 409 ? 'This email is already registered.' : 'Could not save the user. Try again.');
    }
    return undefined;
  }

  private async run(request: Observable<unknown>, success: string): Promise<void> {
    this.busy.set(true);
    try {
      await firstValueFrom(request);
      this.users.reload();
      this.toast.show(success);
    } catch {
      this.toast.show('Something went wrong. Try again.');
    }
    this.busy.set(false);
    this.close();
  }
}
