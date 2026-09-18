import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { FormField, TreeValidationResult, form, maxLength, readonly, required, submit } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { MailingApi } from '../../core/api/mailing.api';
import { MailingList } from '../../core/api/mailing.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { copyToClipboard } from '../../core/ui/files';
import { dateTime } from '../../core/ui/format';
import { Haptics } from '../../core/ui/haptics';
import { Button } from '../../ui/button/button';
import { Property } from '../../ui/data/properties';
import { MessageStrip } from '../../ui/feedback/feedback';
import { Field, Input } from '../../ui/form/field';
import { Switch } from '../../ui/form/toggles';
import { Icon } from '../../ui/icon/icon';
import { Panel } from '../../ui/layout/page';
import { ListActions } from './list-actions';

/**
 * How a list presents itself and who may join it. Switches apply the moment they are flipped;
 * the name and description are saved together, since half a rename is not useful.
 */
@Component({
  selector: 'bm-list-settings',
  imports: [FormField, Icon, Button, Property, MessageStrip, Field, Input, Switch, Panel],
  template: `
    <div class="settings">
      @if (!canWrite()) {
        <bm-message-strip icon="eye">You can see how this list is set up, but only people who run mailing lists can change it.</bm-message-strip>
      }

      <div class="settings__grid">
        <bm-panel heading="Name and description" subheading="How subscribers see the list, in every email and on the sign-up page">
          <form class="settings__form" novalidate (submit)="save($event)">
            <bm-field label="Name" [control]="form.name">
              <input bmInput autocomplete="off" [formField]="form.name" />
            </bm-field>
            <bm-field label="What it is for" optional [control]="form.description">
              <textarea bmInput rows="3" [formField]="form.description"></textarea>
            </bm-field>
            @if (canWrite()) {
              <div class="settings__form-actions">
                @if (dirty()) {
                  <button type="button" bmButton variant="ghost" size="sm" animate.enter="bm-enter-fade" (click)="reset()">Undo changes</button>
                }
                <button type="submit" bmButton variant="primary" size="sm" [disabled]="!dirty()" [loading]="saving()">
                  <svg lucideIcon="check"></svg>
                  Save
                </button>
              </div>
            }
          </form>
        </bm-panel>

        <bm-panel heading="How people join" subheading="Changes apply straight away">
          <div class="settings__switches">
            <div class="settings__switch">
              <bm-switch [checked]="list().doubleOptIn" [disabled]="!canWrite() || busy() === 'doubleOptIn'" (checkedChange)="toggle('doubleOptIn', $event)">
                Ask new addresses to confirm
              </bm-switch>
              <p>
                @if (list().doubleOptIn) {
                  Everyone who joins gets a link first, and nothing is sent to them until they click it. This is the safe default.
                } @else {
                  New addresses are subscribed at once. Only turn this off when every address comes with consent you can show.
                }
              </p>
            </div>

            <div class="settings__switch">
              <bm-switch [checked]="list().publicSignup" [disabled]="!canWrite() || busy() === 'publicSignup'" (checkedChange)="toggle('publicSignup', $event)">
                Public sign-up page
              </bm-switch>
              <p>
                @if (list().publicSignup) {
                  Anyone with the link can join{{ list().doubleOptIn ? ', after confirming their address' : '' }}.
                } @else {
                  Closed. People only join when they are added or imported.
                }
              </p>
              @if (list().signupUrl; as url) {
                <div class="settings__link" animate.enter="bm-enter-rise">
                  <svg lucideIcon="link" [size]="15"></svg>
                  <span class="bm-mono">{{ url }}</span>
                  <button type="button" bmButton variant="ghost" size="sm" iconOnly aria-label="Copy the link" (click)="copy(url)">
                    <svg lucideIcon="copy"></svg>
                  </button>
                  <a bmButton variant="ghost" size="sm" iconOnly aria-label="Open the sign-up page" [href]="url" target="_blank" rel="noopener">
                    <svg lucideIcon="external-link"></svg>
                  </a>
                </div>
              } @else if (list().publicSignup && list().status === 'ARCHIVED') {
                <p class="settings__muted">The page is closed while the list is archived.</p>
              }
            </div>
          </div>
        </bm-panel>

        <bm-panel heading="Record">
          <dl class="bm-properties">
            <bm-property label="Created by" [value]="list().createdBy" />
            <bm-property label="Created" [value]="dateTime(list().createdAt)" />
            <bm-property label="Last changed" [value]="dateTime(list().updatedAt)" />
            <bm-property label="Reference" [value]="list().id" mono copyable />
          </dl>
        </bm-panel>

        @if (canWrite()) {
          <bm-panel class="settings__danger" heading="Archive or delete">
            @if (list().status === 'ACTIVE') {
              <div class="settings__danger-row">
                <div>
                  <strong>Archive this list</strong>
                  <p>Nobody can join and nothing can be sent. Scheduled campaigns go back to drafts. Everything is kept and the list can be restored.</p>
                </div>
                <button type="button" bmButton (click)="archive()">
                  <svg lucideIcon="archive"></svg>
                  Archive
                </button>
              </div>
            } @else {
              <div class="settings__danger-row">
                <div>
                  <strong>Restore this list</strong>
                  <p>It takes subscribers and campaigns again, exactly as it was left.</p>
                </div>
                <button type="button" bmButton (click)="restore()">
                  <svg lucideIcon="archive-restore"></svg>
                  Restore
                </button>
              </div>
              <div class="settings__danger-row">
                <div>
                  <strong>Delete for good</strong>
                  <p>The list, its subscribers and its campaigns are deleted. This cannot be undone.</p>
                </div>
                <button type="button" bmButton variant="danger" (click)="remove()">
                  <svg lucideIcon="trash"></svg>
                  Delete
                </button>
              </div>
            }
          </bm-panel>
        }
      </div>
    </div>
  `,
  styles: `
    .settings { display: grid; gap: 16px; animation: bm-rise var(--bm-duration-slow) var(--bm-ease-emphasized) both; }
    .settings__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 16px; align-items: start; }
    .settings__form { display: grid; gap: 14px; }
    .settings__form-actions { display: flex; justify-content: flex-end; gap: 6px; }
    .settings__switches { display: grid; gap: 6px; }
    .settings__switch { display: grid; gap: 4px; padding: 12px; border-radius: var(--bm-radius-md); background: var(--bm-surface-2); }
    .settings__switch .bm-switch { font-weight: 650; }
    .settings__switch > p { padding-left: 48px; font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
    @media (pointer: coarse) { .settings__switch > p, .settings__link { margin-left: 8px; } }
    .settings__link {
      display: flex; align-items: center; gap: 6px; margin: 6px 0 0 48px; padding: 4px 4px 4px 10px;
      border: 1px solid var(--bm-positive-border); border-radius: var(--bm-radius-md); background: var(--bm-surface); color: var(--bm-positive);
    }
    .settings__link .bm-mono { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; color: var(--bm-text); }
    .settings__muted { padding-left: 48px; font: var(--bm-text-caption); color: var(--bm-text-3); }
    .settings__danger { border-color: var(--bm-negative-border); }
    .settings__danger .bm-panel__body { display: grid; gap: 14px; }
    .settings__danger-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 16px; }
    .settings__danger-row + .settings__danger-row { padding-top: 14px; border-top: 1px solid var(--bm-border-subtle); }
    .settings__danger-row > div { display: grid; gap: 2px; flex: 1 1 240px; }
    .settings__danger-row strong { font: var(--bm-text-subheading); }
    .settings__danger-row p { font: var(--bm-text-caption); font-weight: 500; color: var(--bm-text-3); }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListSettings {
  readonly list = input.required<MailingList>();

  private readonly api = inject(MailingApi);
  private readonly queries = inject(QueryClient);
  private readonly actions = inject(ListActions);
  private readonly sessions = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly haptics = inject(Haptics);

  protected readonly dateTime = dateTime;
  protected readonly canWrite = computed(() => this.sessions.can('mailing:write'));
  protected readonly busy = signal<'doubleOptIn' | 'publicSignup' | null>(null);
  protected readonly saving = signal(false);

  protected readonly model = signal({ name: '', description: '' });
  protected readonly form = form(this.model, (path) => {
    readonly(path, () => !this.canWrite());
    required(path.name, { message: 'A list needs a name.' });
    maxLength(path.name, 120);
    maxLength(path.description, 500);
  });

  /** The name and description as last saved, which the form is compared against. */
  private readonly saved = signal({ name: '', description: '' });
  private syncedId: string | null = null;

  protected readonly dirty = computed(() => {
    const { name, description } = this.model();
    return name.trim() !== this.saved().name || description.trim() !== this.saved().description;
  });

  constructor() {
    // Follows the saved list, unless there are edits in progress that would be overwritten.
    effect(() => {
      const list = this.list();
      untracked(() => {
        const incoming = { name: list.name, description: list.description ?? '' };
        if (list.id !== this.syncedId || (!this.dirty() && !this.saving())) {
          this.syncedId = list.id;
          this.saved.set(incoming);
          this.model.set(incoming);
        }
      });
    });
  }

  protected reset(): void {
    this.model.set(this.saved());
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    if (this.saving() || !this.dirty()) return;
    this.saving.set(true);
    try {
      await submit(this.form, async () => {
        try {
          const { name, description } = this.model();
          const updated = await this.api.updateList(this.list().id, { name: name.trim(), description: description.trim() });
          this.queries.setQueryData(keys.mailing.list(updated.id), updated);
          void this.queries.invalidateQueries({ queryKey: keys.mailing.all, predicate: (query) => query.queryKey[1] !== 'list' });
          this.saved.set({ name: updated.name, description: updated.description ?? '' });
          this.model.set(this.saved());
          this.haptics.success();
          toast.success('Saved', { description: updated.name });
          return undefined;
        } catch (error) {
          return this.explain(error);
        }
      });
    } finally {
      this.saving.set(false);
    }
  }

  protected async toggle(setting: 'doubleOptIn' | 'publicSignup', value: boolean): Promise<void> {
    this.busy.set(setting);
    try {
      const done =
        setting === 'doubleOptIn'
          ? value ? 'New addresses will confirm first' : 'New addresses join at once'
          : value ? 'The sign-up page is open' : 'The sign-up page is closed';
      await this.actions.update(this.list(), { [setting]: value }, done);
    } finally {
      this.busy.set(null);
    }
  }

  protected copy(url: string): void {
    void copyToClipboard(url, 'Sign-up link copied');
  }

  protected archive(): void {
    void this.actions.archive(this.list());
  }

  protected restore(): void {
    void this.actions.restore(this.list());
  }

  protected async remove(): Promise<void> {
    if (await this.actions.remove(this.list())) void this.router.navigate(['/audiences'], { queryParams: { status: 'ARCHIVED' } });
  }

  private explain(error: unknown): TreeValidationResult {
    const failure = ApiError.from(error);
    this.haptics.warning();
    if (failure.status === 409) return [{ kind: 'server', message: 'Another list already has this name.', fieldTree: this.form.name }];
    toast.error('The changes were not saved', { description: failure.message });
    return undefined;
  }
}
