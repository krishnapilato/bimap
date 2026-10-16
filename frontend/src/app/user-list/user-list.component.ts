import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { disabled, email, form, FormField, FormRoot, minLength, required } from '@angular/forms/signals';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NavbarComponent } from '../navbar.component';
import { Role, ROLES, User } from '../user';
import { UserService } from './user-service.service';

const EMPTY = { name: '', surname: '', email: '', password: '', role: 'USER' as Role, enabled: true };

@Component({
  selector: 'app-user-list',
  imports: [FormField, FormRoot, NavbarComponent],
  templateUrl: './user-list.component.html',
  host: { '(document:keydown.escape)': 'close()' },
})
export class UserListComponent {
  private readonly userService = inject(UserService);
  protected readonly auth = inject(AuthService);
  protected readonly roles = ROLES;

  protected readonly users = rxResource({ stream: () => this.userService.findAll(), defaultValue: [] });
  protected readonly query = signal('');
  protected readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.users.value().filter((user) => `${user.name} ${user.surname} ${user.email}`.toLowerCase().includes(query));
  });

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<User | null>(null);
  protected readonly deleting = signal<User | null>(null);
  protected readonly emailing = signal<User | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

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
      disabled(account.enabled, () => this.editing()?.id === this.auth.user()?.id);
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
      this.show(editing ? 'Changes saved.' : `${user.name} ${user.surname} was added.`);
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
      this.show(success);
    } catch {
      this.show('Something went wrong. Try again.');
    }
    this.busy.set(false);
    this.close();
  }

  private noticeTimer?: ReturnType<typeof setTimeout>;

  private show(notice: string): void {
    clearTimeout(this.noticeTimer);
    this.notice.set(notice);
    this.noticeTimer = setTimeout(() => this.notice.set(''), 3000);
  }
}
