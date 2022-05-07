import { Component, OnInit } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { ClientHttpService } from 'src/app/client-http.service';
import { MatchesService } from 'src/app/matches.service';

import { AppState } from './../../../../ngxs';
import { PlayerIndex } from './../../../../ngxs/state/connect4.state';
import { connect4 } from './../../../../settings';
import { BreakpointService } from './../../../../shared/services/breakpoint/breakpoint.service';
import { Connect4Service } from './../../connect4.service';

@Component({
    selector: 'app-board',
    templateUrl: './board.component.html',
    styleUrls: ['./board.component.scss']
})
export class BoardComponent implements OnInit {
    nbColumn = connect4.nbColumns;
    nbRow = connect4.nbRows;
    rowHeight!: string;
    i18nTest!: string;
    isGameOver!: boolean;

    constructor(
        private store: Store,
        private connect4Service: Connect4Service,
        private breakpointService: BreakpointService,
        private clientHttp: ClientHttpService,
        private matches: MatchesService
    ) {}

    ngOnInit(): void {
        this.rowHeight = connect4.boardHeight.lg;
        this.detectBreakpoint();
        this.connect4Service.gameStatusSubject.subscribe(({ status }) => {
            this.isGameOver = status === 'gameOver';
        });
    }

    private detectBreakpoint(): void {
        const { boardHeight } = connect4;
        this.breakpointService.breakpointBS.subscribe((breakpoint) => {
            this.rowHeight = boardHeight[breakpoint];
        });
    }

    public onClickColumn(columnIndex: number): void {
        // We get a snapshot from the store to know the exact user that it's allowed to play
        const { matchId, playerIndex, isGameOver } = this.store.selectSnapshot<{
            matchId: string | null,
            playerIndex: PlayerIndex | null;
            isGameOver: boolean;
        }>((state: AppState) => ({
            // We get the matchId and player index
            matchId: state.connect4.matchId,
            playerIndex: state.connect4.playerPlaying,
            isGameOver: state.connect4.gameOver
        }));


        // At this point we already have created the match so we can access to the values above
        this.matches.getTurn(matchId).subscribe((response) => {
          this.matches.getPlayers(matchId).subscribe((res) => {
            // We take the nextplayer and we pass it at addDiskInColumn
            const playerpos = (res.players).indexOf(this.clientHttp.get_username());
            const playerIndex = playerpos === 1 ? 2 : 1
            if (!isGameOver && this.clientHttp.get_username() == response.turn) {
              this.connect4Service.addDiskInColumn(columnIndex, playerIndex);
            }
          })
        })
    }
}
