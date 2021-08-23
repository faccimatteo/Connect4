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
    playerPlaying: PlayerIndex | null;
    winner: PlayerIndex | null;
    winConditionResolved: number[] | null;
    gameOver: boolean;
};

export type GameOverInfo = { winConditionResolved: number[] | null; byPlayer: PlayerIndex | null };

export interface Connect4Model {
    currentBoard: Connect4Board;
    playerPlaying: PlayerIndex | null;
    winner: PlayerIndex | null;
    winConditionResolved: number[] | null;
    gameOver: boolean;
}

const initialState: Connect4Model = {
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

    // We use pusher to let users communicate
    private pusher;
    private channel;
    private matchId;
    private player1;
    private player2;
    @Output() eventEmitter: EventEmitter<any> = new EventEmitter<any>();

    constructor(private connect4:Connect4Service, private matches:MatchesService) {
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
        const { circleIndex, playerIndex } = payload;
        const updatedBoard = [...state.currentBoard];
        updatedBoard[circleIndex] = playerIndex;
        dispatch(new NextTurn());
        patchState({
            ...state,
            currentBoard: updatedBoard
        });
    }

    @Action(NextTurn)
    nextTurn({ getState, patchState }: StateContext<Connect4Model>): void {
        const state = getState();
        const nextPlayerIndex = state.playerPlaying === 1 ? 2 : 1;

        patchState({
            ...state,
            playerPlaying: nextPlayerIndex
        });
    }

    @Action(SetGameOver)
    setGameOver({ getState, patchState }: StateContext<Connect4Model>, payload: SetGameOver): void {
        const state = getState();
        patchState({
            ...state,
            winner: payload.winnerPlayerIndex,
            winConditionResolved: payload.winConditionResolved,
            gameOver: true
        });
    }

    @Action(StartNewGame)
    startNewGame({ patchState }: StateContext<Connect4Model>): void {
        patchState({
            ...initialState,
            playerPlaying: (Math.floor(Math.random() * 2) + 1) as 1 | 2
        });
      // Setting beginner of the match by getting info from the db
     /* this.matches.getPlayers(this.matchId).subscribe((players) => {
        this.matches.getBeginner(this.matchId).subscribe((beginner) => {
          patchState({
            ...initialState,
            playerPlaying: (players.players).indexOf(beginner.beginner) as 1 | 2
          });
        })
      })*/
    }

    public receiveMatchData(matchId:string, player1:string, player2:String){
        this.matchId = matchId;
        this.player1 = player1;
        this.player2 = player2;
        // We create the channel and we subscribe on it
        this.pusher = new Pusher('2eb653c8780c9ebbe91e', {
          cluster: 'eu'
        });
        this.channel = this.pusher.subscribe(this.matchId);
    }

    public get_player1(){
      return this.player1;
    }

    public get_player2(){
      return this.player2;
    }
}
