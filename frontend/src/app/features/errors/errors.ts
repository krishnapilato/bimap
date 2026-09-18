import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Button } from '../../ui/button/button';
import { EmptyState } from '../../ui/feedback/feedback';
import { Icon } from '../../ui/icon/icon';

@Component({
  selector: 'bm-not-found',
  imports: [RouterLink, Icon, Button, EmptyState],
  template: `
    <div class="bm-page is-narrow">
      <bm-empty-state icon="compass" title="This page is not on the map" description="The link may be old, or the record it pointed to was removed.">
        <a bmButton variant="primary" routerLink="/">
          <svg lucideIcon="house"></svg>
          Back home
        </a>
      </bm-empty-state>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}

@Component({
  selector: 'bm-forbidden',
  imports: [RouterLink, Icon, Button, EmptyState],
  template: `
    <div class="bm-page is-narrow">
      <bm-empty-state icon="shield" title="This part of BiMap is not open to your role" description="If you need access, ask an administrator to change your role.">
        <a bmButton variant="primary" routerLink="/">
          <svg lucideIcon="house"></svg>
          Back home
        </a>
      </bm-empty-state>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Forbidden {}
