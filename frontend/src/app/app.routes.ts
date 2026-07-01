import { Routes } from '@angular/router';
import { adminAuthGuard } from './auth/admin.auth.guard';
import { authGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login';
import { LogoutComponent } from './auth/logout';
import { MainComponent } from './main/main';
import { UserFormComponent } from './user-form/user-form';
import { UserListComponent } from './user-list/user-list';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent, canActivate: [authGuard] },

  { path: '', component: MainComponent, canActivate: [authGuard] },
  { path: 'main', component: MainComponent, canActivate: [authGuard] },

  { path: 'adduser', component: UserFormComponent, canActivate: [adminAuthGuard] },
  { path: 'listuser', component: UserListComponent, canActivate: [adminAuthGuard] },

  { path: '**', redirectTo: '', pathMatch: 'full' },
];
