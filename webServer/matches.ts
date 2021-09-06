import mongoose = require('mongoose');
import {model,Document,Schema} from 'mongoose';

// Definition of the document of the colletcion Match in MongoDB
export interface Match extends Document{
    player1: string,
    player2: string,
    turn: string,
    winner: string,
    loser: string,
    ended: boolean,
    private: boolean,
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
    turn:   {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    winner:   {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    loser:   {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    ended:   {
        type: mongoose.SchemaTypes.Boolean,
        required: false,
        default: false
    },
    private:   {
        type: mongoose.SchemaTypes.Boolean,
        required: true,
    },
    
})


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



