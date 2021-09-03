import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
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
  private channel;
  private searching: boolean = true;

  constructor(private clientHttp: ClientHttpService, private _snackBar: MatSnackBar, private dialog:MatDialog, private router:Router, private matches:MatchesService) {
    // Using Pusher to communicate user that match has been found
    this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
      cluster: 'eu'
    });
  }

  ngOnInit(){}

  searchMatch(){
    // In case we close the search and search again it must me setted to true
    this.searching = true;
    // Listening on a pusher channel
    this.channel = this.pusher.subscribe('lookingForAMatch');

    // We register this user as lookingForAMatch
    this.clientHttp.setLookingForAMatch(true).subscribe(() => {
      this.snackBarRef = this._snackBar.open('Cercando una nuova partita..', 'Cancella');

      // In case we close the snackbar the research stops
      this.snackBarRef.afterDismissed().subscribe(() => {
        this.clientHttp.setLookingForAMatch(false).subscribe(() => {
          this.searching = false;
        })
      });


      // Subscribing at matchFound channel
      this.channel.bind('matchFound', data =>{
        if(data.challenged == this.clientHttp.get_username())
          // We stop looking for a match if the event is triggered so noone can find a game against us
          this.clientHttp.setLookingForAMatch(false).subscribe(() => {
            // We open the dialog and inform the user that the match against data.username is starting
            this.searching = false;
            this.openDialog(data.username, data.matchId)
          })
        }
      );
      this.pairUser();
      })


  }

  pairUser(){

    this.clientHttp.pairForAMatch().subscribe((response) => {

      // We found a user to play with
      // We need to check for searching because it's possible that the function had recursed
      // before the snackbar close and then it would enter on this if branch
      if(response.user != null && this.searching){
        // We unsubscribe from the channel otherwise we get event that we triggered
        this.channel.unsubscribe('matchFound');
        // We dismiss the snackbar
        this.snackBarRef.dismiss()
        this.matches.createMatch(response.user.username).subscribe((matchresponse) => {
          this.clientHttp.setLookingForAMatch(false).subscribe(() => {
            this.openDialog(response.user.username, matchresponse.id)
            this.matches.informingMatchFound(response.user.username, matchresponse.id).subscribe(() => {
            })
          })
        })

      }
      else if(this.searching)
        setTimeout(()=>{this.pairUser()}, this.timeoutResearch)

    })
  }

  openDialog(username:string, matchId:string){
    let dialogRef = this.dialog.open(DialogData, {
      data: {
        user: username,
        //picProfile:res.profilepic --> Not working inside dialog menu
      }
    });

    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        this.searching = false;
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
export class DialogData {
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {}
}
