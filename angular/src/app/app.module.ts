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
import { MatSnackBarModule} from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainComponent,
    UserFormComponent,
    LogoutComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    MatAutocompleteModule,
    CommonModule,
    BrowserAnimationsModule,
    MatSnackBarModule,
    MatRippleModule,
    FormsModule,
    MatFormFieldModule,
    MatSnackBarModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
  providers: [UserService, AuthService, { provide: HTTP_INTERCEPTORS, useClass: SecurityInterceptor, multi: true }],
  bootstrap: [AppComponent]
})
export class AppModule {}