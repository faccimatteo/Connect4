import { PlayerIndex } from './../state/connect4.state';

export class UpdateBoard {
    static readonly type = '[Connect4] Update board';
    constructor(public circleIndex: number, public playerIndex: PlayerIndex, public player: string) {}
}

export class NextTurn {
    static readonly type = "[Connect4] Next player's turn";
    constructor(public nextPlayer:string) {}
}

export class SetGameOver {
    static readonly type = '[Connect4] Game is over';
    constructor(public winnerPlayerIndex: PlayerIndex, public winConditionResolved: number[], public winnerPlayer) {}
}

export class StartNewGame {
    static readonly type = '[Connect4] New game start';
    constructor(public matchId: string) {}
}
