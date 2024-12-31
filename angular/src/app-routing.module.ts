import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './app/auth/login.component';
import { LogoutComponent } from './app/auth/logout.component';
import { MainComponent } from './app/main/main.component';
import { StreetviewComponent } from './app/streetview/streetview.component';
import { UserFormComponent } from './app/user-form/user-form.component';
import { UserListComponent } from './app/user-list/user-list.component';

const routes: Routes = [
  {
    path: '',
    component: MainComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'logout',
    component: LogoutComponent,
  },
  {
    path: 'main',
    component: MainComponent,
  },
  {
    path: 'adduser',
    component: UserFormComponent,
  },
  {
    path: 'listuser',
    component: UserListComponent,
  },
  {
    path: 'streetview',
    component: StreetviewComponent,
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}