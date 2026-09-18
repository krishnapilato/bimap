import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { toast } from 'ngx-sonner';

import { ApiError } from '../../core/api/api-error';
import { RegistrationsApi } from '../../core/api/registrations.api';
import { REGISTRATION_TRANSITIONS, Registration, RegistrationStatus, isEditableByAuthor } from '../../core/api/registry.models';
import { SessionStore } from '../../core/auth/session.store';
import { keys } from '../../core/query/keys';
import { Haptics } from '../../core/ui/haptics';
import { Confirm } from '../../ui/overlay/confirm-dialog';

export type RegistrationAction = 'edit' | 'submit' | 'verify' | 'reject' | 'reopen' | 'archive' | 'delete';

export interface ActionPresentation {
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger' | 'subtle' | 'ghost';
}

export const ACTIONS: Record<RegistrationAction, ActionPresentation> = {
  edit: { label: 'Edit', icon: 'pencil', variant: 'secondary' },
  submit: { label: 'Submit for review', icon: 'send', variant: 'primary' },
  verify: { label: 'Verify', icon: 'badge-check', variant: 'primary' },
  reject: { label: 'Send back', icon: 'undo-2', variant: 'secondary' },
  reopen: { label: 'Return to draft', icon: 'rotate-ccw', variant: 'ghost' },
  archive: { label: 'Archive', icon: 'archive', variant: 'ghost' },
  delete: { label: 'Delete', icon: 'trash', variant: 'danger' },
};

/**
 * Everything that can happen to a registration after it is recorded, with the same rules as the
 * business service: authors change their own work while it is a draft or sent back, reviewers
 * verify or return it, and nothing leaves the archive.
 */
@Injectable({ providedIn: 'root' })
export class RegistrationActions {
  private readonly api = inject(RegistrationsApi);
  private readonly sessions = inject(SessionStore);
  private readonly queries = inject(QueryClient);
  private readonly confirm = inject(Confirm);
  private readonly haptics = inject(Haptics);
  private readonly router = inject(Router);

  available(registration: Registration): RegistrationAction[] {
    const reviewer = this.sessions.can('registration:read-all');
    const writer = this.sessions.can('registration:write');
    const own = registration.createdBy === this.sessions.user()?.email;
    const next = REGISTRATION_TRANSITIONS[registration.status];
    const actions: RegistrationAction[] = [];

    if (!writer) return actions;
    if (reviewer || (own && isEditableByAuthor(registration.status))) actions.push('edit');
    if (next.includes('SUBMITTED') && (own || reviewer)) actions.push('submit');
    if (reviewer && next.includes('VERIFIED')) actions.push('verify');
    if (reviewer && next.includes('REJECTED')) actions.push('reject');
    if (next.includes('DRAFT') && (own || reviewer)) actions.push('reopen');
    if (next.includes('ARCHIVED') && (own || reviewer)) actions.push('archive');
    if (registration.status === 'DRAFT' ? own || reviewer : reviewer) actions.push('delete');
    return actions;
  }

  /** Runs an action, asking first where it matters. Resolves to the updated record, or null. */
  async run(action: RegistrationAction, registration: Registration): Promise<Registration | null> {
    switch (action) {
      case 'edit':
        await this.router.navigate(['/survey', registration.id]);
        return null;
      case 'submit':
        return this.move(registration, 'SUBMITTED', undefined, 'Sent for review');
      case 'verify':
        return this.move(registration, 'VERIFIED', undefined, 'Registration verified');
      case 'reject': {
        const answer = await this.confirm.ask({
          title: 'Send it back?',
          message: `${registration.assetName} returns to ${registration.createdBy} with your note, and can be corrected and resubmitted.`,
          confirmLabel: 'Send back',
          tone: 'danger',
          icon: 'undo-2',
          reason: { label: 'What needs fixing', placeholder: 'The cadastral reference points at the wrong parcel…', required: true },
        });
        return answer.confirmed ? this.move(registration, 'REJECTED', answer.reason, 'Sent back to the surveyor') : null;
      }
      case 'reopen': {
        const answer = await this.confirm.ask({
          title: 'Return it to draft?',
          message: 'It leaves the review queue and can be edited again before it is resubmitted.',
          confirmLabel: 'Return to draft',
          icon: 'rotate-ccw',
        });
        return answer.confirmed ? this.move(registration, 'DRAFT', undefined, 'Returned to draft') : null;
      }
      case 'archive': {
        const answer = await this.confirm.ask({
          title: 'Archive this registration?',
          message: 'Archived registrations stay in the registry for reference but can no longer change.',
          confirmLabel: 'Archive',
          icon: 'archive',
          reason: { label: 'Why it is archived', placeholder: 'Duplicate of an earlier record…' },
        });
        return answer.confirmed ? this.move(registration, 'ARCHIVED', answer.reason, 'Registration archived') : null;
      }
      case 'delete':
        return this.remove(registration);
    }
  }

  private async move(registration: Registration, status: RegistrationStatus, note: string | undefined, done: string): Promise<Registration | null> {
    try {
      const updated = await this.api.changeStatus(registration.id, { status, note });
      this.haptics.success();
      toast.success(done, { description: updated.assetName });
      this.refresh(updated);
      return updated;
    } catch (error) {
      this.haptics.warning();
      toast.error('That did not go through', { description: ApiError.from(error).message });
      return null;
    }
  }

  private async remove(registration: Registration): Promise<null> {
    const answer = await this.confirm.ask({
      title: 'Delete this registration?',
      message: `${registration.assetName} in ${registration.municipality} is removed for good. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      icon: 'trash',
    });
    if (!answer.confirmed) return null;
    try {
      await this.api.delete(registration.id);
      this.haptics.success();
      toast.success('Registration deleted', { description: registration.assetName });
      this.queries.removeQueries({ queryKey: keys.registrations.detail(registration.id) });
      void this.queries.invalidateQueries({ queryKey: keys.registrations.all });
      await this.router.navigate(['/registry']);
    } catch (error) {
      this.haptics.warning();
      toast.error('The registration could not be deleted', { description: ApiError.from(error).message });
    }
    return null;
  }

  private refresh(updated: Registration): void {
    this.queries.setQueryData(keys.registrations.detail(updated.id), updated);
    void this.queries.invalidateQueries({ queryKey: keys.registrations.all, predicate: (query) => query.queryKey[1] !== 'detail' });
  }
}
