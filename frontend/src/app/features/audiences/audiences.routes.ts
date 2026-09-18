import { Routes } from '@angular/router';

import { leaveCampaignGuard } from './campaign-guard';

export const AUDIENCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./audiences').then((m) => m.Audiences),
  },
  {
    path: ':listId',
    title: 'Mailing list',
    loadComponent: () => import('./list-workspace').then((m) => m.ListWorkspace),
  },
  {
    // `new` and an id share the route, so saving a new draft moves to its address without the
    // editor being torn down and built again.
    path: ':listId/campaigns/:campaignId',
    title: 'Campaign',
    canDeactivate: [leaveCampaignGuard],
    loadComponent: () => import('./campaign').then((m) => m.CampaignPage),
  },
];
