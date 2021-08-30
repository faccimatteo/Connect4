import { Component, HostBinding, Inject, Injectable, OnDestroy, OnInit } from '@angular/core';
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
  username: string,
  matchId: string
}
@Injectable({
  providedIn: 'root'
})
@Component({
    selector: 'app-match',
    templateUrl: './match.component.html',
    styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit, OnDestroy {

  public id:string = this.route.snapshot.paramMap.get('id');
  themingSubscription!: Subscription;
  public isEnded: Boolean = false;
  public canLeaveTheGame: Boolean = true

  constructor(
    private themingService: ThemingService,
    public connect4Service: Connect4Service,
    private route: ActivatedRoute,
    private matches: MatchesService,
    private dialog: MatDialog,
    private clientHttp: ClientHttpService,
    private audioService: AudioService
  ) {}
  @HostBinding('class') public cssClass!: string;

  ngOnInit(): void {
    this.matches.getMatchById(this.id).subscribe((response) => {
      this.isEnded = response.ended;

      this.connect4Service.diskAddedSubject.subscribe(() => {
        const gameFinishInfo = this.connect4Service.checkGameFinished();

        if (gameFinishInfo !== null) {
          this.canLeaveTheGame = false;
          this.connect4Service.gameFinish(gameFinishInfo);
        }
      })

      this.themingSubscription = this.themingService.themeBS.subscribe((theme: string) => {
          this.cssClass = theme;
      });
    })
  }

  ngOnDestroy(): void {
      this.themingSubscription.unsubscribe();
  }

  openDialog(){
    const dialogRef = this.dialog.open(MatchDialogData, {
      data: {
        username: this.clientHttp.get_username(),
        matchId: this.id
      }
    });

  }

}

@Component({
  selector: 'dialog-data',
  templateUrl: './dialog-data.html',
})
export class MatchDialogData {
  constructor(public dialogRef: MatDialogRef<MatchDialogData>,
    @Inject(MAT_DIALOG_DATA) public data: MatchDialogData,
    private router: Router,
    private matches: MatchesService,
    private matchcomponent: MatchComponent) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  // Quit from the match and register the loss
  onQuit(){
    this.matches.communicateLoss(this.data.matchId).subscribe(() => {
      console.log("comunicationLoss event sended")
      this.dialogRef.close();
      this.matchcomponent.isEnded = true;
      this.router.navigate(['/home']);
    })
  }

}
