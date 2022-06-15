import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatRippleModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from 'src/app-routing.module';
import { AppComponent } from './app.component';
import { SecurityInterceptor } from './auth/auth.interceptor';
import { AuthService } from './auth/auth.service';
import { LoginComponent } from './auth/login.component';
import { LogoutComponent } from './auth/logout.component';
import { MainComponent } from './main/main.component';
import { StreetviewComponent } from './streetview/streetview.component';
import { UserFormComponent } from './user-form/user-form.component';
import {
  DialogElementsExampleDialog, EditingEmailDialog, UserListComponent
} from './user-list/user-list.component';
import { UserService } from './user-service.service';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainComponent,
    UserFormComponent,
    LogoutComponent,
    UserListComponent,
    DialogElementsExampleDialog,
    EditingEmailDialog,
    StreetviewComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    MatTooltipModule,
    MatToolbarModule,
    MatButtonModule,
    FormsModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatIconModule,
    MatPaginatorModule,
    MatSlideToggleModule,
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