import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import Pusher from 'pusher-js';
import { ClientHttpService } from '../client-http.service';
import { MatchesService } from '../matches.service';

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

  private timeoutResearch = 2000;
  private timeoutDialog = 2000;
  //private profilepic;
  private snackBarRef;
  private pusher;

  constructor(private clientHttp: ClientHttpService, private _snackBar: MatSnackBar, private dialog:MatDialog, private router:Router, private matches:MatchesService) {
    // Using Pusher to communicate user that match has been found
    this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });
  }

  ngOnInit(){}

  searchMatch(){

    // Listening on a pusher channel
    var channel = this.pusher.subscribe('lookingForAMatch');

    // We register this user as lookingForAMatch
    this.clientHttp.setLookingForAMatch(true).subscribe(() => {
      this.snackBarRef = this._snackBar.open('Cercando una nuova partita..', 'Cancella');

      // Subscribing at matchFound channel
      channel.bind('matchFound', data =>{
        console.log("data is ", data)
        if(data.username == this.clientHttp.get_username())
          this.clientHttp.setLookingForAMatch(false).subscribe(() => {
            this.openDialog(data.username, data.matchId)
          })
        }
      );
      this.pairUser();
      this.snackBarRef.afterDismissed().subscribe(() => {
        this.clientHttp.setLookingForAMatch(false).subscribe(() => {
        })
      });
      })

  }

  pairUser(){

    this.clientHttp.pairForAMatch().subscribe((response) => {

      //this.clientHttp.get_profile_pic(response.user.username).subscribe((res) => {
      // We found a user to play with
      if(response.user != null){
        console.log("match has been created")
        this.matches.createMatch(response.user.username).subscribe((matchresponse) => {
          this.clientHttp.setLookingForAMatch(false).subscribe(() => {
            this.openDialog(response.user.username, matchresponse.id)
            console.log(response.user.username + " informed that the match has been created")
            this.matches.informingMatchFound(response.user.username, matchresponse.id).subscribe(() => {
              console.log("user " + response.user.username + " has been notificated of the match started by " + this.clientHttp.get_username())
            })
          })
        })

      }
      else
        setTimeout(()=>{this.pairUser()}, this.timeoutResearch)
      //})
    })
  }

  openDialog(username:string, matchId:string){
    console.log("opened dialog")
    let dialogRef = this.dialog.open(DialogDataExampleDialog, {
      data: {
        user: username,
        //picProfile:res.profilepic --> Not working inside dialog menu
      }
    });

    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        this.snackBarRef.dismiss();
        dialogRef.close();
        this.router.navigate(['match', matchId])
      }, this.timeoutDialog)
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
