import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

import { Confirm } from '../../ui/overlay/confirm-dialog';

/** Anything with work that would be lost by leaving. */
export interface Unsaved {
  hasUnsavedChanges(): boolean;
}

/** Asks before leaving an editor with changes that were never saved. */
export const leaveCampaignGuard: CanDeactivateFn<Unsaved> = async (component) => {
  const confirm = inject(Confirm);
  if (!component?.hasUnsavedChanges()) return true;
  const answer = await confirm.ask({
    title: 'Leave without saving?',
    message: 'The changes to this campaign since it was last saved will be lost.',
    confirmLabel: 'Discard the changes',
    tone: 'danger',
    icon: 'undo-2',
  });
  return answer.confirmed;
};
