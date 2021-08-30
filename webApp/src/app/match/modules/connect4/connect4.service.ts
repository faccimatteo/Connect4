import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Pusher from 'pusher-js';
import { Observable, of, Subject } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { ClientHttpService } from 'src/app/client-http.service';
import { MatchesService } from 'src/app/matches.service';
import { AudioService } from '../../shared/services/audio/audio.service';

import { AppState } from './../../ngxs';
import { SetGameOver, StartNewGame, UpdateBoard, UpdateSpectatorBoard } from './../../ngxs/actions/connect4.actions';
import { Connect4Board, GameOverInfo, PlayerIndex } from './../../ngxs/state/connect4.state';
import { connect4 } from './../../settings';

export type DiskAddedSubject = { slotFilled: number; byPlayerIndex: PlayerIndex };
export type UpdatedBoardSubject = { updatedBoard: (PlayerIndex | null)[] };
export type GameStatusSubject = { status: 'gameOver' };

@Injectable({
    providedIn: 'root'
})
export class Connect4Service {
  diskAddedSubject: Subject<DiskAddedSubject> = new Subject(); // triggered when a disk is added
  gameStatusSubject: Subject<GameStatusSubject> = new Subject(); // triggered when game finished or start
  updateBoardSubject: Subject<UpdatedBoardSubject> = new Subject(); // triggered when board is updated in spectators
  winConditionsArray: number[][];

  private matchId;
  public player1;
  public player2;
  private pusher;
  private channel;
  private canLeaveTheGame: Boolean = true;

  constructor(private store: Store, private matches:MatchesService, private clientHttp:ClientHttpService, private audioService:AudioService) {
      this.winConditionsArray = this.getWinConditionsArray();
  }

  // TODO : need to fix bug for gameFinish is called multiple times
  public gameFinish(gameFinishInfo: GameOverInfo): void {

    this.canLeaveTheGame = false;
    this.matches.getPlayers(this.matchId).subscribe((res) => {
      this.store.dispatch(new SetGameOver(gameFinishInfo.byPlayer, gameFinishInfo.winConditionResolved));
      this.gameStatusSubject.next({ status: 'gameOver' });

      // The player defeated update the status of the match
      if(this.clientHttp.get_username() != res.players[gameFinishInfo.byPlayer-1]){
        this.defeat();
      }else
        this.audioService.playAudio('victory');

    })

  }

  // We are sure that we have already received all the data from match at this point
  public newGame(): void {
      this.canLeaveTheGame = true;
      this.store.dispatch(new StartNewGame(this.matchId));
      // We create the channel and we subscribe on it
      this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
        cluster: 'eu'
      });
      this.channel = this.pusher.subscribe(this.matchId);

      // Listening on the channel waiting for the next move
      this.channel.bind('nextMove', (data) => {
        this.matches.getPlayers(this.matchId).subscribe((response) => {

          // We check if we actually need to update our board status (because if we are the sender of the event we don't actually need to update that)

          if(response.players[data.playerIndex] != this.clientHttp.get_username()){
            const availableSlotIndex = this.findAvailableSlot(data.columnIndex);
            const byPlayerIndex = data.playerIndex === 1 ? 2: 1;
            this.store.dispatch(new UpdateBoard(availableSlotIndex, byPlayerIndex));
            // We need to convert the index of the player in PlayerIndex
            // We received the move from the opponent so we have to change byPlayerIndex
            this.diskAddedSubject.next({ slotFilled: availableSlotIndex, byPlayerIndex: byPlayerIndex });

          }
        })
      })

      // If we are a spectator we need to request the current board configuration
      this.matches.getPlayers(this.matchId).subscribe((response) => {
        if(!response.players.includes(this.clientHttp.get_username())){

          // Requesting a correct configuration from one player
          this.matches.requestState(this.matchId).subscribe(() => {
          })

          this.channel.bind('sendState', (data) => {
            // We received the configuration from the players
            // Updating the configuration received
            this.store.dispatch(new UpdateSpectatorBoard(data.currentBoard))
            this.updateBoardSubject.next({ updatedBoard: data.currentBoard })
          })

        }
        // For efficiency we make that just the first player serve the requests
        else if (this.clientHttp.get_username() == response.players[0]){

          // Listening on the channel waiting for a configuration from the
          this.channel.bind('requestState', () => {
            // We need to send the configuration to the users
            const { currentBoard } = this.store.selectSnapshot<{
                currentBoard: (PlayerIndex | null)[];
            }>((state: AppState) => ({
              currentBoard: state.connect4.currentBoard,
            }));

            this.matches.sendState(this.matchId, currentBoard).subscribe(() => {
              console.log("Configuration sent")
            })
          })
        }
      })

      // Listening on the channel waiting for opponent to exit from the game
      this.channel.bind('communicateLoss', (data) => {
        this.matches.getPlayers(this.matchId).subscribe((response) => {

          const byPlayer = response.players.indexOf(data.winner) == 1 ? 2 : 1;
          // Dispatching of GameOver event passing the index of the defeated user
          const winConditionResolved: number[] = [];
          // We communicate the end of the match
          this.gameFinish({winConditionResolved, byPlayer})

        })
      })
      //this.gameStatusSubject.next({ status: 'newGame' });
  }

  public findAvailableSlot(columnIndex: number){
    const board = this.store.selectSnapshot<Connect4Board>((state: AppState) => state.connect4.currentBoard);
      let availableSlotIndex = null; //dovrebbe essere null poiché potrebbero non esserci delle colonne vuote*/
      const { nbColumns } = connect4;

      // find an available slot in the selected column
      board.forEach((element, index) => {
          const isSlotEmpty = element === null;
          const slotFound = availableSlotIndex !== null;
          if (index % nbColumns === columnIndex % nbColumns && isSlotEmpty && !slotFound) {
              availableSlotIndex = index;
          }
      });

      return availableSlotIndex

  }

  public addDiskInColumn(columnIndex: number, playerIndex: PlayerIndex): null | number {
      const availableSlotIndex = this.findAvailableSlot(columnIndex)

      if (availableSlotIndex !== null) {

        // update store
        this.store.dispatch(new UpdateBoard(availableSlotIndex, playerIndex));

        // emit event at all the subscribed componenets
        this.diskAddedSubject.next({ slotFilled: availableSlotIndex, byPlayerIndex: playerIndex });

        // We send in channel that we have done the move
        this.matches.makeMove(columnIndex, this.matchId).subscribe(() => {

        })
      }

      return availableSlotIndex;
  }

  public checkGameFinished(): null | GameOverInfo {
      const boardSnapshot = this.store.selectSnapshot<Connect4Board>(
          (state: AppState) => state.connect4.currentBoard
      );
      console.log(boardSnapshot)
      const result = this.winConditionsArray.filter((winArr) => {
          return (
              boardSnapshot[winArr[0]] !== null &&
              boardSnapshot[winArr[0]] === boardSnapshot[winArr[1]] &&
              boardSnapshot[winArr[0]] === boardSnapshot[winArr[2]] &&
              boardSnapshot[winArr[0]] === boardSnapshot[winArr[3]]
          );
      });
      const isBoardFullOfDisks = boardSnapshot.filter((disk) => disk === null).length === 0;

      if (isBoardFullOfDisks) {
          return {
              winConditionResolved: null,
              byPlayer: null,
          };
      }

      if(result.length > 0){
        var matchPlayers;
        var playerIndex;
        // We know that given a position we can retrieve the winner (as far we did in connect4state when we started the game)
        this.matches.getPlayers(this.matchId).subscribe((players) => {
          playerIndex = boardSnapshot[result[0][0]] as 1 | 2;
          matchPlayers = players.players

        })

        return { winConditionResolved: result[0], byPlayer: boardSnapshot[result[0][0]] as 1 | 2}
      }else
        return null;
  }

  public getWinConditionsArray(): number[][] {
      const result: number[][] = [];
      const { nbColumns, nbRows } = connect4;
      const nbSeries = 4;
      const rowsTemplate = Array(nbRows)
          .fill([])
          .map((element, index) =>
              Array(nbColumns)
                  .fill(1)
                  .map((el, idx) => idx + index * nbRows + 1 * index)
          );
      const columnsTemplate = Array(nbColumns)
          .fill([])
          .map((element, index) =>
              Array(nbRows)
                  .fill(1)
                  .map((el, idx) => index + idx * nbColumns)
          );

      const getDiagonals = () => {
          const getDiagonalCombinationOf = (position, rowFloor, rowIndex, reverse: boolean = false) => {
              const output = [position];
              let count = 1;

              while (count < nbSeries) {
                  let toPush = null;
                  toPush = rowsTemplate[rowFloor + count][reverse ? rowIndex - count : rowIndex + count];
                  if (toPush) {
                      output.push(toPush);
                  }
                  count = count + 1;
              }
              return output.length === nbSeries ? output : null;
          };
          rowsTemplate.forEach((row, rowFloor) => {
              row.forEach((position, rowIndex) => {
                  if (rowsTemplate.length - rowFloor >= nbSeries) {
                      const combination = getDiagonalCombinationOf(position, rowFloor, rowIndex);
                      const combinationReverse = getDiagonalCombinationOf(position, rowFloor, rowIndex, true);
                      if (combination !== null) {
                          result.push(combination);
                      }
                      if (combinationReverse !== null) {
                          result.push(combinationReverse);
                      }
                  }
              });
          });
      };

      const getCombinationBundleOf = (templateBundle) => {
          const getCombinationOf = (range, startingIndex) => {
              let limitReached = false;
              let cursor = startingIndex;
              const output = [];
              while (!limitReached && output.length < nbSeries) {
                  const toPush = range[cursor];
                  if (typeof toPush === 'undefined') {
                      limitReached = true;
                  } else {
                      output.push(toPush);
                  }
                  cursor = cursor + 1;
              }

              return output.length === nbSeries ? output : null;
          };
          templateBundle.forEach((bundle) => {
              let foundCombination = true;
              let index = 0;
              while (foundCombination) {
                  const combination = getCombinationOf(bundle, index);
                  if (combination !== null) {
                      result.push(combination);
                  } else {
                      foundCombination = false;
                  }
                  index = index + 1;
              }
          });
      };

      getCombinationBundleOf(columnsTemplate);
      getCombinationBundleOf(rowsTemplate);
      getDiagonals();
      return result;
    }

    // We need these methods to pass data to banner-info
    public receiveMatchData(matchId:string, player1:string, player2:String){
          this.matchId = matchId;
          this.player1 = player1;
          this.player2 = player2;
    }

    defeat(){
      this.matches.setMatchLoss(this.matchId).subscribe(() => {
        console.log("win/loss registered")
      })
    }

    public getCanLeaveTheGame(): Boolean{
      return this.canLeaveTheGame && (this.clientHttp.get_username() == this.player1 || this.clientHttp.get_username() == this.player2);
    }

}
