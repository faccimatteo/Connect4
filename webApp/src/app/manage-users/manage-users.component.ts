import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  dialog: any;

  constructor(private clientHttp: ClientHttpService) { }

  ngOnInit(): void {
    this.clientHttp.get_users().subscribe((response) => {
      this.users = response.users
      if(this.users.length == 0)
        this.error = "Non ci sono utenti registrati"
    })
  }

  openDialog(){
    // Opening dialog to confirm elimination
    const dialogRef = this.dialog.open(UserDialogData, {
      data: {
        username: this.clientHttp.get_username(),
      }
    });
  }

}

@Component({
selector: 'dialog-data',
templateUrl: './dialog-data.html',
})
export class UserDialogData {
  constructor(public dialogRef: MatDialogRef<UserDialogData>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
    private clientHttp: ClientHttpService) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  // Deleting a user from the DB
  deleteUser(){
    this.clientHttp.delete_user(this.data.username).subscribe(() => {
      this.dialogRef.close();
    })
  }

}
