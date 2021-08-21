import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ClientHttpService } from '../client-http.service';

export interface DialogData {
  user: string,
  profilepic: string
}


@Component({
  selector: 'app-search-matches',
  templateUrl: './search-matches.component.html',
  styleUrls: ['./search-matches.component.css']
})
export class SearchMatchesComponent implements OnInit {

  private timeoutResearch = 2000
  private timeoutDialog = 2000
  private user
  private profilepic
  private snackBarRef

  constructor(private clientHttp: ClientHttpService, private _snackBar: MatSnackBar, private dialog:MatDialog, private router:Router) { }

  ngOnInit(): void {}

  searchMatch(){
    // We register this user as lookingForAMatch
    this.clientHttp.setLookingForAMatch(true).subscribe(() => {
      this.snackBarRef = this._snackBar.open('Cercando una nuova partita..', 'Cancella');
        this.pairUser()
        this.snackBarRef.afterDismissed().subscribe(() => {
          this.clientHttp.setLookingForAMatch(false).subscribe(() => {
          })
        });
      })

  }

  pairUser(){

    this.clientHttp.pairForAMatch().subscribe((response) => {

      this.clientHttp.get_profile_pic(response.user.username).subscribe((res) => {
        if(response.user != null){
          let dialogRef = this.dialog.open(DialogDataExampleDialog, {
            data: {
              user: response.user.username,
              picProfile:res.profilepic
            }
          });

          dialogRef.afterOpened().subscribe(() => {
            setTimeout(() => {
              this.snackBarRef.dismiss()
              dialogRef.close();
              this.router.navigate(['match'])
            }, this.timeoutDialog)
          })
        }
        else
          setTimeout(()=>{this.pairUser()}, this.timeoutResearch)
      })
    })
  }


}

@Component({
  selector: 'dialog-data',
  templateUrl: './dialog-data.html',
})
export class DialogDataExampleDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}
}
