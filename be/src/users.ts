//definition of users in db and list of all possible management operations on them
import mongoose = require('mongoose');
import {model,Document,Schema} from 'mongoose';
import crypto = require('crypto');


export interface User extends Document {
    readonly _id: mongoose.Schema.Types.ObjectId,   //id of the user
    username: string,
    name: string,
    surname: string,
    moderator: boolean, // can be a moderator or not
    firstAccess: boolean, // used to change password on first access
    profilePic: string, // profile pic stored in Base64
    salt: string,   // salt is a random string that will be mixed with the actual password before hashing
    digest: string, // digest of the clear password + salt
    win: number,
    loss: number,
    draw: number,
    friends: string[],  //all the friends realated with the user  
    pendingRequests: string[],  //all of user's friends request  (can be visible only to the user himself/herself)
    isLookingForAMatch: boolean,
    setPassword: (pwd:string)=>void,
    validatePassword: (pwd:string)=>boolean,
    setDefault: ()=>void,
}

// Defining the schema User to map it into MongoDB
var userSchema = new Schema<User>( {
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
    salt:   {
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
    friends:    {
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
})


userSchema.methods.setPassword = function( pwd:string ) {
    // We use a random 16-bytes hex string for salt
    this.salt = crypto.randomBytes(16).toString('hex'); 

    // We create the Hmac (hash-based message authentication code) by adding the crypted salt created before
    var hmac = crypto.createHmac('sha512', this.salt );
    // We update the previous hmac by adding the password 
    hmac.update( pwd );
    this.digest = hmac.digest('hex'); // The final digest depends both by the password and the salt
}

userSchema.methods.validatePassword = function( pwd:string ):boolean {

    // To validate the password, we compute the digest with the
    // same HMAC to check if it matches with the digest we stored
    // in the database.
    //
    var hmac = crypto.createHmac('sha512', this.salt );
    hmac.update(pwd);
    var digest = hmac.digest('hex');
    return (this.digest === digest);
}


// At the moment of creation, the user has most of the fields empty
userSchema.methods.setDefault = function(){
    this.win = 0;
    this.loss = 0;
    this.draw = 0;
}

// Return the schema of the db 'User' in MongoDB
export function getSchema() { return userSchema; }

// Mongoose Model
var userModel;  // This is not exposed outside the model
// Used to manipulate the collection with ts
export function getModel() : mongoose.Model< User >  { // Return Model as singleton
    if( !userModel ) {
        userModel = model('User', getSchema() )
    }
    return userModel;
}

// Function to add a new user by using mongoose model
// it adds the user and can be manipulated through ts (on the returning object)
export function newUser(data): User {
    var _usermodel = getModel();
    var user = new _usermodel(data);
    return user;
}