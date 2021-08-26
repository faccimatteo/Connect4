import { Component, HostBinding, Inject, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Subscription } from 'rxjs';

import { Connect4Service } from './modules/connect4/connect4.service';
import { AudioService } from './shared/services/audio/audio.service';
import { AppSettingsService } from './shared/services/appSettings/app-service.service';
import { ThemingService } from './shared/services/theming/theming.service';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchesService } from '../matches.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ClientHttpService } from '../client-http.service';

export interface MatchDialogData {
  username: string
}

@Component({
    selector: 'app-match',
    templateUrl: './match.component.html',
    styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit, OnDestroy {

  public id:string = this.route.snapshot.paramMap.get('id');
  themingSubscription!: Subscription;
  public isEnded: Boolean = false;

  constructor(
      private store: Store,
      private themingService: ThemingService,
      private appSettingsService: AppSettingsService,
      private connect4Service: Connect4Service,
      private audioService: AudioService,
      private route: ActivatedRoute,
      private matches: MatchesService,
      private dialog: MatDialog,
      private router: Router,
      private clientHttp: ClientHttpService
  ) {}
  @HostBinding('class') public cssClass!: string;

  ngOnInit(): void {
    this.connect4Service.diskAddedSubject.subscribe(() => {
      const gameFinishInfo = this.connect4Service.checkGameFinished();
      if (gameFinishInfo !== null) {
          this.connect4Service.gameFinish(gameFinishInfo);

          // play audio
          //const hasIdentifiedWinner = gameFinishInfo.byPlayer !== null;
          //this.audioService.playAudio(hasIdentifiedWinner ? 'victory' : 'noWinner');
      }
    })

    this.themingSubscription = this.themingService.themeBS.subscribe((theme: string) => {
        this.cssClass = theme;
    });

    this.matches.getMatchById(this.id).subscribe((response) => {
      console.log(response.ended)
      this.isEnded = response.ended
      this.connect4Service.newGame();
    })


  }

  ngOnDestroy(): void {
      this.themingSubscription.unsubscribe();
  }

  public openDialog(){
    const dialogRef = this.dialog.open(MatchDialogData, {
      data: {username: this.clientHttp.get_username()}
    });

    dialogRef.afterClosed().subscribe(result => {
      // We must update the stats of players
      this.router.navigate(['/home'])
    });
  }

}

@Component({
  selector: 'dialog-data',
  templateUrl: './dialog-data.html',
})
export class MatchDialogData {
  constructor(public dialogRef: MatDialogRef<MatchDialogData>,
    @Inject(MAT_DIALOG_DATA) public data: MatchDialogData) {}

  onNoClick(): void {
    this.dialogRef.close();
  }
}
