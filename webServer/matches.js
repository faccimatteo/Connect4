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
    turn: {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    winner: {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    loser: {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    ended: {
        type: mongoose.SchemaTypes.Boolean,
        required: false,
        default: false
    },
    private: {
        type: mongoose.SchemaTypes.Boolean,
        required: true,
    },
});
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