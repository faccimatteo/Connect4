import mongoose = require('mongoose');
import {model,Document,Schema} from 'mongoose';

// Definition of the document of the colletcion Match in MongoDB
export interface Match extends Document{
    player1: string,
    player2: string,
    spectators: [string[],boolean[]],
    winner: string,
    ended: boolean,
    getPlayers: ()=>string[],
    getSpectators: ()=>string[],
    getWinner: ()=>string,
    setEnding: ()=>void,
    hasEnded: ()=>boolean
}

// Defining the schema match to map it into MongoDB
var matchSchema = new Schema<Match>({
    player1:   {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    player2:   {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    spectators:   [{
        type: mongoose.SchemaTypes.Mixed,
        required: true
    }],
    winner:   {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    ended:   {
        type: mongoose.SchemaTypes.Boolean,
        required: false,
        default: false
    },
    
})

matchSchema.methods.getPlayers = function():string[] {
    const players:string[] = new String[2];
    players[0] = this.player1;
    players[1] = this.player2;
    return players;

}

matchSchema.methods.getSpectators = function():string[] {
    return this.spectators[0];
}

matchSchema.methods.getWinner = function():string{
    return this.winner;
}

matchSchema.methods.setEnding = function():void{
    this.ended = true;
}

matchSchema.methods.hasEnded = function():boolean{
    return this.ended;
}


// Return the schema of the db 'Match' in MongoDB
export function getSchema() { return matchSchema; }

// Mongoose Model
var matchModel;  // This is not exposed outside the model
// Used to manipulate the collection with ts
export function getModel() : mongoose.Model< Match >  { // Return Model as singleton
    if( !matchModel ) {
        matchModel = model('Match', getSchema() )
    }
    return matchModel;
}



