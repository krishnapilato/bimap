import { Routes } from '@angular/router';
import { AdminAuthGuard } from './auth/admin.auth.guard';
import { AuthGuard } from './auth/auth.guard';
import { LoginComponent } from './auth/login.component';
import { LogoutComponent } from './auth/logout.component';
import { MainComponent } from './main/main.component';
import { UserFormComponent } from './user-form/user-form.component';
import { UserListComponent } from './user-list/user-list.component';

export const routes: Routes = [
  {
    path: '',
    component: MainComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'main',
    component: MainComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'logout',
    component: LogoutComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'adduser',
    component: UserFormComponent,
    canActivate: [AdminAuthGuard],
  },
  {
    path: 'listuser',
    component: UserListComponent,
    canActivate: [AdminAuthGuard],
  },
  {
    path: '**',
    component: MainComponent,
    canActivate: [AuthGuard],
  }
];