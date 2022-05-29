import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from './app/auth/auth.guard';
import { LoginComponent } from './app/auth/login.component';
import { LogoutComponent } from './app/auth/logout.component';
import { UserFormComponent } from './app/user-form/user-form.component';
import { UserListComponent } from './app/user-list/user-list.component';

const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'logout', component: LogoutComponent, canActivate: [AuthGuard] },
  { path: 'main', component: UserListComponent, canActivate: [AuthGuard] },
  { path: 'adduser', component: UserFormComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }