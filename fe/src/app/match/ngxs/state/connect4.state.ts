import { connect4 } from './../../settings/index';
import { NextTurn, SetGameOver, StartNewGame, UpdateSpectatorBoard } from './../actions/connect4.actions';
import { Injectable } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { UpdateBoard } from '../actions/connect4.actions';
import { MatchesService } from 'src/app/matches.service';
import { state } from '@angular/animations';

export type PlayerIndex = 1 | 2;

export type Connect4Board = (PlayerIndex | null)[];

export type Connect4Status = {
    playerPlaying: PlayerIndex | null;
    winner: PlayerIndex | null;
    winConditionResolved: number[] | null;
    gameOver: boolean;
};

export type GameOverInfo = { winConditionResolved: number[] | null; byPlayer: PlayerIndex | null};

export interface Connect4Model {
    matchId: string | null,
    currentBoard: Connect4Board;
    playerPlaying: PlayerIndex | null;
    winner: PlayerIndex | null;
    winConditionResolved: number[] | null;
    gameOver: boolean;
}

const initialState: Connect4Model = {
    matchId: null,
    currentBoard: new Array(connect4.nbColumns * connect4.nbRows).fill(null),
    playerPlaying: null,
    winner: null,
    winConditionResolved: null,
    gameOver: false
};

@State<Connect4Model>({
    name: 'connect4',
    defaults: { ...initialState }
})
@Injectable()
export class Connect4State {

    constructor(private matches:MatchesService) {
    }

    @Selector()
    static getCurrentBoard(state: Connect4Model): Connect4Board {
        return state.currentBoard;
    }

    @Selector()
    static getGameStatus(state: Connect4Model): Connect4Status {
        const { playerPlaying, winner, gameOver, winConditionResolved } = state;
        return {
            playerPlaying,
            winner,
            winConditionResolved,
            gameOver
        };
    }

    @Action(UpdateBoard)
    updateBoard({ getState, patchState, dispatch }: StateContext<Connect4Model>, payload: UpdateBoard): void {
      const state = getState();
      const { circleIndex, playerIndex} = payload;
      const updatedBoard = [...state.currentBoard];
      updatedBoard[circleIndex] = playerIndex;

      // We say that the next turn is the one passed in updateBoard
      dispatch(new NextTurn());
      patchState({
          ...state,
          currentBoard: updatedBoard
      });
    }

    // We pass in payload the correct current board configuration received from the player
    @Action(UpdateSpectatorBoard)
    updateSpectatorBoard({ getState, patchState }: StateContext<Connect4Model>, payload: UpdateSpectatorBoard): void {
      const state = getState();
      patchState({
        ...state,
        currentBoard: payload.currentBoardStatus,
      })
    }

    @Action(NextTurn)
    nextTurn({ getState, patchState }: StateContext<Connect4Model>): void {
        const state = getState();
        const nextPlayerIndex = state.playerPlaying === 1 ? 2 : 1;

        // One we want to change turn we update the player and the position
        patchState({
            ...state,
            playerPlaying: nextPlayerIndex
        });
    }

    @Action(SetGameOver)
    setGameOver({ getState, patchState }: StateContext<Connect4Model>, payload: SetGameOver): void {
        const state = getState();
        // We get winnerPlayer so we can know which player has won and we get winner index too so we can display it on banner-info
        patchState({
            ...state,
            winner: payload.winnerPlayerIndex,
            winConditionResolved: payload.winConditionResolved,
            gameOver: true
        });
    }

    @Action(StartNewGame)
    startNewGame({ patchState }: StateContext<Connect4Model>, payload: StartNewGame): void {
      // Setting beginner of the match by getting info from the db
      this.matches.getPlayers(payload.matchId).subscribe((players) => {
        this.matches.getTurn(payload.matchId).subscribe((beginner) => {
          const index = (players.players).indexOf(beginner.turn)
          patchState({
            ...initialState,
            matchId: payload.matchId,
            playerPlaying: (index+1) as 1 | 2
          });
        })
      })
    }
}
