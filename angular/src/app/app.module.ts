import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login.component';
import { MainComponent } from './main/main.component';
import { UserFormComponent } from './user-form/user-form.component';
import { AppRoutingModule } from 'src/app-routing.module';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { UserService } from './user-service.service';
import { AuthService } from './auth/auth.service';
import { SecurityInterceptor } from './auth/auth.interceptor';
import { LogoutComponent } from './auth/logout.component';
import { MatRippleModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  UserListComponent,
  DialogElementsExampleDialog
} from './user-list/user-list.component';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StreetviewComponent } from './streetview/streetview.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainComponent,
    UserFormComponent,
    LogoutComponent,
    UserListComponent,
    DialogElementsExampleDialog,
    StreetviewComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    MatTooltipModule,
    MatButtonModule,
    FormsModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    MatDialogModule,
    BrowserAnimationsModule,
    MatAutocompleteModule,
    CommonModule,
    MatSnackBarModule,
    MatTableModule,
    MatRippleModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule
  ],
  exports: [MatTableModule],
  providers: [
    UserService,
    AuthService,
    { provide: HTTP_INTERCEPTORS, useClass: SecurityInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}