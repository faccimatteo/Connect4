"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModel = exports.getSchema = void 0;
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
// Defining the schema match to map it into MongoDB
var matchSchema = new mongoose_1.Schema({
    player1: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    player2: {
        type: mongoose.SchemaTypes.String,
        required: true
    },
    spectators: [{
            type: mongoose.SchemaTypes.Mixed,
            required: true
        }],
    winner: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    loser: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    ended: {
        type: mongoose.SchemaTypes.Boolean,
        required: false,
        default: false
    },
});
matchSchema.methods.getPlayers = function () {
    const players = new String[2];
    players[0] = this.player1;
    players[1] = this.player2;
    return players;
};
matchSchema.methods.getSpectators = function () {
    return this.spectators[0];
};
matchSchema.methods.getWinner = function () {
    return this.winner;
};
matchSchema.methods.getLoser = function () {
    return this.loser;
};
matchSchema.methods.setEnding = function () {
    this.ended = true;
};
matchSchema.methods.hasEnded = function () {
    return this.ended;
};
// Return the schema of the db 'Match' in MongoDB
function getSchema() { return matchSchema; }
exports.getSchema = getSchema;
// Mongoose Model
var matchModel; // This is not exposed outside the model
// Used to manipulate the collection with ts
function getModel() {
    if (!matchModel) {
        matchModel = mongoose_1.model('Match', getSchema());
    }
    return matchModel;
}
exports.getModel = getModel;
//# sourceMappingURL=matches.js.map