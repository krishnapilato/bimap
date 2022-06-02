import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { User } from '../user';
import { UserService } from '../user-service.service';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';
import {MatSnackBar} from '@angular/material/snack-bar';
import {MatDialogModule} from '@angular/material/dialog';
import {MatDialog} from '@angular/material/dialog';
import {MatSelectModule} from '@angular/material/select';
import { FormControl } from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css'],
  providers: [UserService]
})
export class UserListComponent implements OnInit, AfterViewInit {

      displayedColumns: string[] = ['name', 'surname', 'email', 'userStatus', 'applicationRole', 'actions', 'actions2'];
  dataSource = new MatTableDataSource<User>() ;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private userService: UserService, private _snackbar: MatSnackBar, public dialog: MatDialog) {}

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }


    applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage(); 
  }

  public openDialog(row: any): void {
    let dialogRef = this.dialog.open(DialogElementsExampleDialog);
    dialogRef.componentInstance.globalID = row.id;
  }

  ngOnInit() {
    this.userService.findAll().subscribe(data => {this.dataSource.data = data; });
  }

  public deleteRow(row:any) {
    if(confirm('Are you sure to delete this record?')) {
      this.userService.delete(row.id).subscribe(data => {
        this.dataSource.data = this.dataSource.data.filter(u => u !== row);
      });
      this._snackbar.open('Record deleted successfully', '', {duration: 2000});
    }
  }
}

@Component({
  selector: 'dialog-elements',
  templateUrl: 'dialog-elements.html',
  providers: [UserService]
})
export class DialogElementsExampleDialog implements OnInit {

  public surname : FormControl = new FormControl();
  public name : FormControl = new FormControl();
  public email : FormControl = new FormControl();
  public applicationRole : FormControl = new FormControl();
  public password : FormControl = new FormControl();

  public globalID!: number;
  private newUser : User = new User();

    ngOnInit() {
      
   console.log("EMAIL " + this.globalID);
  }

  approles: any[] = [
    {value: 'USER', viewValue: 'USER'},
    {value: 'MANAGER', viewValue: 'MANAGER'},
    {value: 'ADMINISTRATOR', viewValue: 'ADMINISTRATOR'},
  ];

  constructor(private userService: UserService, public dialog: MatDialog, private _snackbar: MatSnackBar) {}

  onNoClick(event: any): void {

    if(confirm("Are you sure to update this record?")) {

        this.newUser.name = this.name.value;
        this.newUser.surname = this.surname.value;
        this.newUser.email = this.email.value;
        this.newUser.applicationRole = this.applicationRole.value;
        this.newUser.password = this.password.value;

        this.userService.update(this.newUser, this.globalID).subscribe(data => {
          this.dialog.closeAll();
          this._snackbar.open('Record with ID ' + this.globalID + ' updated successfully', '', {duration: 2000});
          location.reload(); // it's a workaround, need to find a better solution
        });
    }
    else {
      this.dialog.closeAll();
    }
  }
}