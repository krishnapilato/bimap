import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAuthGuard } from './app/auth/admin.auth.guard';
import { AuthGuard } from './app/auth/auth.guard';
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
    canActivate: [AuthGuard] 
  },
  { 
    path: 'login', 
    component: LoginComponent 
  },
  { 
    path: 'logout', 
    component: LogoutComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'main', 
    component: MainComponent, 
    canActivate: [AuthGuard] 
  },
  { 
    path: 'adduser', 
    component: UserFormComponent, 
    canActivate: [AdminAuthGuard] 
  },
  {
    path: 'listuser',
    component: UserListComponent,
    canActivate: [AdminAuthGuard]
  },
  {
    path: 'streetview',
    component: StreetviewComponent,
    canActivate: [AuthGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}