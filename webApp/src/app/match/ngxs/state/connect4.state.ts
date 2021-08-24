import { connect4 } from './../../settings/index';
import { NextTurn, SetGameOver, StartNewGame } from './../actions/connect4.actions';
import { EventEmitter, Injectable, Output } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { UpdateBoard } from '../actions/connect4.actions';
import { Connect4Service } from '../../modules/connect4/connect4.service';
import Pusher from 'pusher-js';
import { Observable } from 'rxjs';
import { MatchesService } from 'src/app/matches.service';

export type PlayerIndex = 1 | 2;

export type Connect4Board = (PlayerIndex | null)[];

export type Connect4Status = {
    player: string | null,
    playerPlaying: PlayerIndex | null;
    winner: PlayerIndex | null;
    winConditionResolved: number[] | null;
    gameOver: boolean;
};

export type GameOverInfo = { winConditionResolved: number[] | null; byPlayer: PlayerIndex | null; winnerPlayer: string | null};

export interface Connect4Model {
    matchId: string | null,
    player: string | null,
    currentBoard: Connect4Board;
    playerPlaying: PlayerIndex | null;
    winnerPlayer: string | null;
    winner: PlayerIndex | null;
    winConditionResolved: number[] | null;
    gameOver: boolean;
}

const initialState: Connect4Model = {
    matchId: null,
    currentBoard: new Array(connect4.nbColumns * connect4.nbRows).fill(null),
    playerPlaying: null,
    player: null,
    winnerPlayer: null,
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
        const { player, playerPlaying, winner, gameOver, winConditionResolved } = state;
        return {
            player,
            playerPlaying,
            winner,
            winConditionResolved,
            gameOver
        };
    }

    @Action(UpdateBoard)
    updateBoard({ getState, patchState, dispatch }: StateContext<Connect4Model>, payload: UpdateBoard): void {
        const state = getState();
        const { circleIndex, playerIndex, player } = payload;
        const updatedBoard = [...state.currentBoard];
        updatedBoard[circleIndex] = playerIndex;

        // We say that the next turn is the one passed in updateBoard
        dispatch(new NextTurn(player));
        patchState({
            ...state,
            currentBoard: updatedBoard
        });
    }

    @Action(NextTurn)
    nextTurn({ getState, patchState }: StateContext<Connect4Model>, payload:NextTurn): void {
        const state = getState();
        const nextPlayerIndex = state.playerPlaying === 1 ? 2 : 1;

        // One we want to change turn we update the player and the position
        patchState({
            ...state,
            player: payload.nextPlayer,
            playerPlaying: nextPlayerIndex
        });
    }

    @Action(SetGameOver)
    setGameOver({ getState, patchState }: StateContext<Connect4Model>, payload: SetGameOver): void {
        const state = getState();
        // We get winnerPlayer so we can know which player has won and we get winner index too so we can display it on banner-info
        patchState({
            ...state,
            winnerPlayer: payload.winnerPlayer,
            winner: payload.winnerPlayerIndex,
            winConditionResolved: payload.winConditionResolved,
            gameOver: true
        });
    }

    @Action(StartNewGame)
    startNewGame({ getState, patchState }: StateContext<Connect4Model>, payload: StartNewGame): void {
      // Setting beginner of the match by getting info from the db
      console.log(payload.matchId)
      var state = getState()
      this.matches.getPlayers(payload.matchId).subscribe((players) => {
        this.matches.getTurn(payload.matchId).subscribe((beginner) => {
          const index = (players.players).indexOf(beginner.turn)

          patchState({
            ...initialState,
            matchId: payload.matchId,
            player: players.players[index],
            playerPlaying: (index+1) as 1 | 2
          });
          console.log("playerindex at start from players is " + state.playerPlaying )
          console.log("current player turn (ngxs) : " + players.players[index])
        })
      })
    }
}
