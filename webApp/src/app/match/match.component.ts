import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable, Subscription } from 'rxjs';

import { Connect4Service } from './modules/connect4/connect4.service';
import { AudioService } from './shared/services/audio/audio.service';
import { AppSettingsService } from './shared/services/appSettings/app-service.service';
import { ThemingService } from './shared/services/theming/theming.service';
import { ActivatedRoute } from '@angular/router';
import { MatchesService } from '../matches.service';
import { Connect4State } from './ngxs/state/connect4.state';

@Component({
    selector: 'app-match',
    templateUrl: './match.component.html',
    styleUrls: ['./match.component.scss']
})
export class MatchComponent implements OnInit, OnDestroy {
    public id:string = this.route.snapshot.paramMap.get('id');
    themingSubscription!: Subscription;

    constructor(
        private store: Store,
        private themingService: ThemingService,
        private appSettingsService: AppSettingsService,
        private connect4Service: Connect4Service,
        private audioService: AudioService,
        private route: ActivatedRoute,
        private matches: MatchesService
    ) {}
    @HostBinding('class') public cssClass!: string;

    ngOnInit(): void {


      this.connect4Service.diskAddedSubject.subscribe(() => {
        const gameFinishInfo = this.connect4Service.checkGameFinished();
        if (gameFinishInfo !== null) {
            this.connect4Service.gameFinish(gameFinishInfo);

            // play audio
            const hasIdentifiedWinner = gameFinishInfo.byPlayer !== null;
            this.audioService.playAudio(hasIdentifiedWinner ? 'victory' : 'noWinner');
        }
      })

      this.themingSubscription = this.themingService.themeBS.subscribe((theme: string) => {
          this.cssClass = theme;
      });

      this.connect4Service.newGame();

    }

    ngOnDestroy(): void {
        this.themingSubscription.unsubscribe();
    }

    //TODO: funzione per negare l'accesso all'utente se volesse accedere alla pagina (se il match è finito)

}
