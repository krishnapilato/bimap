import { Injectable, inject } from '@angular/core';

import { SessionStore } from '../../core/auth/session.store';
import { EMPTY_SURVEY, SurveyModel } from './survey-form';

export interface LocalDraft {
  model: SurveyModel;
  savedAt: string;
}

const PREFIX = 'bimap.survey';

/**
 * Work in progress kept on this device, per person and per registration, so a closed tab or a
 * lost signal in the field costs nothing. It is removed as soon as the server has the record.
 */
@Injectable({ providedIn: 'root' })
export class SurveyDrafts {
  private readonly sessions = inject(SessionStore);

  read(id: string | null): LocalDraft | null {
    try {
      const raw = localStorage.getItem(this.key(id));
      if (!raw) return null;
      const draft = JSON.parse(raw) as LocalDraft;
      return { model: { ...EMPTY_SURVEY, ...draft.model }, savedAt: draft.savedAt };
    } catch {
      return null;
    }
  }

  write(id: string | null, model: SurveyModel): string | null {
    const savedAt = new Date().toISOString();
    try {
      localStorage.setItem(this.key(id), JSON.stringify({ model, savedAt } satisfies LocalDraft));
      return savedAt;
    } catch {
      return null;
    }
  }

  remove(id: string | null): void {
    try {
      localStorage.removeItem(this.key(id));
    } catch {
      // Nothing was kept, so there is nothing to remove.
    }
  }

  private key(id: string | null): string {
    return `${PREFIX}.${this.sessions.user()?.id ?? 'anonymous'}.${id ?? 'new'}`;
  }
}
