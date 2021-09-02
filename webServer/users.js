"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newUser = exports.getModel = exports.getSchema = void 0;
//definition of users in db and list of all possible management operations on them
const mongoose = require("mongoose");
const mongoose_1 = require("mongoose");
const crypto = require("crypto");
// Defining the schema User to map it into MongoDB
var userSchema = new mongoose_1.Schema({
    username: {
        type: mongoose.SchemaTypes.String,
        required: true,
        unique: true
    },
    name: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    surname: {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    moderator: {
        type: mongoose.SchemaTypes.Boolean,
        required: true,
        default: false
    },
    firstAccess: {
        type: mongoose.SchemaTypes.Boolean,
        required: false,
    },
    profilePic: {
        type: mongoose.SchemaTypes.String,
        required: false,
    },
    salt: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    digest: {
        type: mongoose.SchemaTypes.String,
        required: false
    },
    win: {
        type: mongoose.SchemaTypes.Number,
        required: true
    },
    loss: {
        type: mongoose.SchemaTypes.Number,
        required: true
    },
    draw: {
        type: mongoose.SchemaTypes.Number,
        required: true
    },
    friends: {
        type: [mongoose.SchemaTypes.String],
        required: false
    },
    pendingRequests: {
        type: [mongoose.SchemaTypes.String],
        required: false
    },
    isLookingForAMatch: {
        type: mongoose.SchemaTypes.Boolean,
        required: true,
        default: false
    },
});
userSchema.methods.setPassword = function (pwd) {
    // We use a random 16-bytes hex string for salt
    this.salt = crypto.randomBytes(16).toString('hex');
    // We create the Hmac (hash-based message authentication code) by adding the crypted salt created before
    var hmac = crypto.createHmac('sha512', this.salt);
    // We update the previous hmac by adding the password 
    hmac.update(pwd);
    this.digest = hmac.digest('hex'); // The final digest depends both by the password and the salt
};
userSchema.methods.validatePassword = function (pwd) {
    // To validate the password, we compute the digest with the
    // same HMAC to check if it matches with the digest we stored
    // in the database.
    //
    var hmac = crypto.createHmac('sha512', this.salt);
    hmac.update(pwd);
    var digest = hmac.digest('hex');
    return (this.digest === digest);
};
userSchema.methods.hasModeratorRole = function () {
    return this.moderator;
};
userSchema.methods.setModerator = function () {
    if (!this.hasModeratorRole())
        this.moderator = true;
};
// At the moment of creation, the user has most of the fields empty
userSchema.methods.setDefault = function () {
    this.win = 0;
    this.loss = 0;
    this.draw = 0;
};
userSchema.methods.getName = function () {
    return this.name;
};
userSchema.methods.getSurname = function () {
    return this.surname;
};
userSchema.methods.getWin = function () {
    return this.win;
};
userSchema.methods.getLoss = function () {
    return this.loss;
};
userSchema.methods.getDraw = function () {
    return this.draw;
};
userSchema.methods.getFriends = function () {
    return this.friends;
};
userSchema.methods.getPendingRequests = function () {
    return this.pendingRequests;
};
userSchema.methods.addFriend = function (user) {
    if (this.pendingRequests.includes(user.username)) {
        this.friends.push(user.username);
        return true;
    }
    else
        return false;
};
// Return the schema of the db 'User' in MongoDB
function getSchema() { return userSchema; }
exports.getSchema = getSchema;
// Mongoose Model
var userModel; // This is not exposed outside the model
// Used to manipulate the collection with ts
function getModel() {
    if (!userModel) {
        userModel = mongoose_1.model('User', getSchema());
    }
    return userModel;
}
exports.getModel = getModel;
// Function to add a new user by using mongoose model
// it adds the user and can be manipulated through ts (on the returning object)
function newUser(data) {
    var _usermodel = getModel();
    var user = new _usermodel(data);
    return user;
}
exports.newUser = newUser;
//# sourceMappingURL=users.js.map