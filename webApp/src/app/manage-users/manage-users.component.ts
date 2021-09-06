import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';
import { MatchComponent } from '../match/match.component';
import { MatchesService } from '../matches.service';

export interface UserDialogData{
  username:string,
}

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.component.html',
  styleUrls: ['../search-friends/search-friends.component.css']
})
export class ManageUsersComponent implements OnInit {

  public users:any = []
  public error:string = ''

  constructor(private clientHttp: ClientHttpService, private dialog:MatDialog) { }

  ngOnInit(): void {
    this.clientHttp.get_users().subscribe((response) => {
      this.users = response.users
      if(this.users.length == 0)
        this.error = "Non ci sono utenti registrati"
    })
  }

  openDialog(user_to_delete:string){
    // Opening dialog to confirm elimination
    const dialogRef = this.dialog.open(UserDialogData, {
      data: {
        username: user_to_delete,
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      // We re update the users table
      this.ngOnInit()
    })
  }

}

@Component({
selector: 'dialog-data',
templateUrl: './dialog-data.html',
})
export class UserDialogData {


  constructor(public dialogRef: MatDialogRef<UserDialogData>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
    private clientHttp: ClientHttpService,
    private snackbar:MatSnackBar) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  // Deleting a user from the DB
  deleteUser(){
    this.clientHttp.delete_user(this.data.username).subscribe(() => {
      this.dialogRef.close();
      this.snackbar.open("L'utente " + this.data.username + " è stato correttamente eliminato.", undefined,  {duration: 3000})
    })
  }

}
