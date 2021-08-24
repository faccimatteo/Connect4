import { Injectable } from '@angular/core';
import { Store } from '@ngxs/store';
import Pusher from 'pusher-js';
import { Observable, of, Subject } from 'rxjs';
import { ClientHttpService } from 'src/app/client-http.service';
import { MatchesService } from 'src/app/matches.service';

import { AppState } from './../../ngxs';
import { SetGameOver, StartNewGame, UpdateBoard } from './../../ngxs/actions/connect4.actions';
import { Connect4Board, GameOverInfo, PlayerIndex } from './../../ngxs/state/connect4.state';
import { connect4 } from './../../settings';

export type DiskAddedSubject = { slotFilled: number; byPlayerIndex: PlayerIndex };
export type GameStatusSubject = { status: 'gameOver' };

@Injectable({
    providedIn: 'root'
})
export class Connect4Service {
  diskAddedSubject: Subject<DiskAddedSubject> = new Subject(); // trigger when a disk is added
  gameStatusSubject: Subject<GameStatusSubject> = new Subject(); // trigger when game finished or start
  winConditionsArray: number[][];

  private matchId;
  private player1;
  private player2;
  private pusher;
  private channel;

  constructor(private store: Store, private matches:MatchesService, private clientHttp:ClientHttpService) {
      this.winConditionsArray = this.getWinConditionsArray();
  }

  public gameFinish(gameFinishInfo: GameOverInfo): void {
      this.store.dispatch(new SetGameOver(gameFinishInfo.byPlayer, gameFinishInfo.winConditionResolved, gameFinishInfo.winnerPlayer));
      this.gameStatusSubject.next({ status: 'gameOver' });
  }

  // We are sure that we have already received all the data from match at this point
  public newGame(): void {
      this.store.dispatch(new StartNewGame(this.matchId));
      // We create the channel and we subscribe on it
      console.log("connected to pusher")
      this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
        cluster: 'eu'
      });
      this.channel = this.pusher.subscribe(this.matchId);
      console.log("subscribed to channel")
      this.channel.bind('nextMove', (data) => {
        console.log("Update board from remote move request")
        this.matches.getPlayers(this.matchId).subscribe((response) => {
          // We check if we actually need to update our board status (because if we are the sender of the event we don't actually need to update that)
          console.log("against " + response.players[data.playerIndex])
          console.log("you " + this.clientHttp.get_username())
          if(response.players[data.playerIndex] != this.clientHttp.get_username()){
            const availableSlotIndex = data.columnIndex
            this.store.dispatch(new UpdateBoard(availableSlotIndex, data.playerIndex, this.clientHttp.get_username()));
          }
        })
      })
      //this.gameStatusSubject.next({ status: 'newGame' });
  }

  public findAvailableSlot(columnIndex: number){
    const board = this.store.selectSnapshot<Connect4Board>((state: AppState) => state.connect4.currentBoard);
      let availableSlotIndex = null;
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

  public addDiskInColumn(columnIndex: number, playerIndex: PlayerIndex, player: string ): null | number {
      const availableSlotIndex = this.findAvailableSlot(columnIndex)

      if (availableSlotIndex !== null) {
          // update store
          this.store.dispatch(new UpdateBoard(availableSlotIndex, playerIndex, player));
          // emit event at all the subscribed componenets
          this.diskAddedSubject.next({ slotFilled: availableSlotIndex, byPlayerIndex: playerIndex });
          // We send in chanel that we have done the move
          this.matches.makeMove(columnIndex, this.matchId).subscribe(() => {
            console.log("data sent from " + this.clientHttp.get_username() + " via pusher")
          })
      }

      return availableSlotIndex;
  }

  // TODO: we have to insert a win in the db
  public checkGameFinished(): null | GameOverInfo {
      const boardSnapshot = this.store.selectSnapshot<Connect4Board>(
          (state: AppState) => state.connect4.currentBoard
      );
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
              winnerPlayer: null
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

        return { winConditionResolved: result[0], byPlayer: boardSnapshot[result[0][0]] as 1 | 2, winnerPlayer:matchPlayers[playerIndex-1]}
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

    public get_player1(){
      return this.player1;
    }

    public get_player2(){
      return this.player2;
    }
}
