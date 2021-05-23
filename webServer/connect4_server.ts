const result = require('dotenv').config()    

if (result.error) {
  console.log("Unable to load \".env\" file. Please provide one to store the JWT secret key");
  process.exit(-1);
}
if( !process.env.JWT_SECRET ) {
  console.log("\".env\" file loaded but JWT_SECRET=<secret> key-value pair was not found");
  process.exit(-1);
}

import fs = require('fs');                      // File System module
import http = require('http');                  // HTTP module
import https = require('https');                // HTTPS module
import colors = require('colors');              // Colors module for debugging 
colors.enabled = true;


import mongoose = require('mongoose');
import crypto = require('crypto');
import {Match} from './matches';
import * as match from './matches';

import { User } from './users';
import * as user from './users';

import express = require('express');
import bodyparser = require('body-parser');      // body-parser middleware is used to parse the request body and
                                                 // directly provide a JavaScript object if the "Content-type" is
                                                 // application/json

import passport = require('passport');           // authentication middleware for Express
import passportHTTP = require('passport-http');  // implements Basic and Digest authentication for HTTP (used for /login endpoint)

import jsonwebtoken = require('jsonwebtoken');  // JWT generation
import jwt = require('express-jwt');            // JWT parsing middleware for express

import cors = require('cors');                  // Enable CORS middleware
import io = require('socket.io');               // Socket.io websocket library
import { nextTick } from 'process';

declare global {
  namespace Express {
      interface User {
        id: string,
        username: string,
        name: string,
        surname: string,
        moderator: boolean, 
        salt: string,   
        digest: string, 
        win: number,
        loss: number,
        draw: number,
        friends: string[],  
        pendingRequests: string[],  
      }
    }
}


var ios = undefined;
var app = express();

var auth = jwt( {secret: process.env.JWT_SECRET} );

//function that could be useful
var isModerator 

// cors make possibile to send request from a website to another website on the broswer by adding a section on the header
app.use(cors());

// Automatically parse JWT token if there's one on the request's
app.use(bodyparser.json());

app.use( (req,res,next) => {
  console.log("------------------------------------------------".inverse)
  console.log("New request for: "+req.url );
  console.log("Method: "+req.method);
  next();
})

// Add API routes to express application

// App's root: return to the client every possible endpoints of our app
app.get("/", (req,res) => {
  
  res.status(200).json({
    api_version: "0.0.1",
    endpoints: ["/users", "/matches", "/login"]
  })
});

// Managing get and post request of user at the same time
app.route('/users').get(auth, (req,res,next) => {

  if(!req.user.moderator)
    return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().find({}).then((users)=>{
    console.log(users);
    return res.status(200).json(users);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })

}).post(auth,(req,res,next) => {
  // Checking if the user who sent the request is a moderator
  if(!req.user.moderator)
    return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  var u = user.newUser( req.body );
  if(!req.body.username || !req.body.password || !req.body.name || !req.body.surname || !req.body.moderator) {
    return next({ statusCode:404, error: true, 
      errormessage: "Check fields in body request.\n Fields that must be inserted are: username, name, surname, moderator"} );

  }

  // Checking if the user already exist
  const checkingUser = user.getModel().findOne({username:req.params.username});
  if(!checkingUser)
    return next({ statusCode:404, error: true, errormessage: "User's username already exists. Try with a different username"});

  // Inserting a new user inside the system
  const temporaryPassword = crypto.randomBytes(16).toString('hex');
  u.setPassword(temporaryPassword);
    
  // Set user as a moderator if defined
  if(req.body.moderator)
    u.setModerator();
    else 
      u.moderator = false;

  u.setDefault();

  // Saving the new user on the db 'users'
  u.save().then( (data) => {
    return res.status(200).json({ error: false, errormessage: "", id: data._id });
  }).catch( (reason) => {
    if( reason.code === 11000 )
      return next({statusCode:404, error:true, errormessage: "User already exists"} );
    return next({ statusCode:404, error: true, errormessage: "DB error: "+reason.errmsg });
  })

});


// We looking for a user with a certain username
app.route('/users/:username').get(auth, (req,res,next) => {

  if(!req.user.moderator)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().findOne({username: req.params.username}).then((user)=>{
    return res.status(200).json(user);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })

}).delete(auth, (req,res,next)=>{
  // I can remove a user only if I am a moderator
  if(!req.user.moderator)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().deleteOne({username:req.params.username},(succ)=>{
    return next({ statusCode:200, error: false, errormessage: "User " + req.params.username + " successfully from the DB"}); 
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// We want to know the stats of a certain user
app.get('/users/:username/stats', auth, (req,res,next) => {

  if(!req.user.moderator)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().findOne({username: req.params.username}).select({win:1,loss:1,draw:1}).then((stats)=>{
    return res.status(200).json(stats);

  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })

});


// We want to know the friends of a certain user
app.get('/users/:username/friends', auth, (req,res,next) => {

  // To find user's friends the user that send the request has to be that user
  if(req.user.username != req.params.username)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user"});

  user.getModel().findOne({username: req.params.username}).select({friends:1}).exec((friends)=>{
    return res.status(200).json(friends);
    
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })

});

// We want to know the friends request of a certain user
app.get('/users/:username/friendsRequests', auth, (req,res,next) => {

  // To find user's friends the user that send the request has to be that user
  if(req.user.username != req.params.username)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user"});

  user.getModel().findOne({username: req.params.username}).select({pendingRequests:1}).exec((requests)=>{
    return res.status(200).json(requests);
    
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })

});


// Main route to get matches
app.route("/matches").get(auth, (req,res,next) => {
  // We find all the matches and we output them in JSON format
  match.getModel().find({},(matches)=>{
    res.status(200).json(matches);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
}).post(auth, (req,res,next) => {
  // Inserting a new match with post
  if(!req.user.moderator)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  // We insert a new match from the data included in the body
  match.getModel().find({},(matches)=>{
    if(!req.params.player1 || !req.params.player2 || !req.params.spectators || !req.params.winner || !req.params.ended)
      return next({ statusCode:404, error: true, errormessage: "Check fields in body request.\n Fields that must be inserted are: player1, player2, spectators, winner,ended"});
    
      
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// We want to know which players played/ are playing the match
app.get("/matches/:id/players", auth, (req,res,next) => {
  
  var myId = mongoose.Types.ObjectId('req.params.id');
  match.getModel().findOne(myId).select({player1:1,player2:1}).exec((matches)=>{
    res.status(200).json(matches);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// We want to how many players are watching the match
app.get("/matches/:id/observers", auth, (req,res,next) => {

  var myId = mongoose.Types.ObjectId('req.params.id');
  match.getModel().findOne(myId).select({spectators:1}).where('spectators[1]').equals(true).exec((observers)=>{
    res.status(200).json(observers);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// We want to know how many players have seen the match
app.get("/matches/:id/spectators", auth, (req,res,next) => {
  
  var myId = mongoose.Types.ObjectId('req.params.id');
  match.getModel().findOne(myId).select({spectators:1}).exec((spectators)=>{
    res.status(200).json(spectators);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

//TODO: controllare se funziona HTTPS
// We want to know the winner of a match
app.get("/matches/:id/winner", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId('req.params.id');
  match.getModel().findOne(myId).select({winner:1}).exec((winner)=>{
    res.status(200).json(winner);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// We want to know the loser of a match
app.get("/matches/:id/loser", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId('req.params.id');
  match.getModel().findOne(myId).select({winner:1}).then((query)=>{
    const players = match.getSchema().methods.getPlayers();

    // Checking for the opposite player 
    for(let i in players){
      if(!(i === query.winner))
        res.status(200).json({"loser":i});
    }
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});


// Configuring HTTP basic authentication strategy trough passport middleware.
// NOTE: Always use HTTPS with Basic Authentication

passport.use( new passportHTTP.BasicStrategy(
  function(userdata, password, done) {

    // "done" callback (verify callback) documentation:  http://www.passportjs.org/docs/configure/

    // Delegate function we provide to passport middleware
    // to verify user credentials 

    console.log("New login attempt from ".green + user );
    
    user.getModel().findOne( {username: userdata} , (err, user)=>{
      if( err ) {
        return done( {statusCode: 500, error: true, errormessage:err} );
      }

      if( !user ) {
        return done(null,false,{statusCode: 500, error: true, errormessage:"User not exists"});
      }

      if( user.validatePassword( password ) ) {
        return done(null, user);
      }

      return done(null,false,{statusCode: 500, error: true, errormessage:"Password is not correct"});
    })
  }
));


// Login endpoint uses passport middleware to check
// user credentials before generating a new JWT
app.get("/login", passport.authenticate('basic', { session: false }), (req,res,next) => {

  // If we reach this point, the user is successfully authenticated and
  // has been injected into req.user

  // We now generate a JWT with the useful user data
  // and return it as response
  
  var tokendata = {
    id: req.user.id,
    username: req.user.username,
    moderator: req.user.moderator
  };

  console.log("Login granted. Token has been generated" );
  var token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' } );

  // Note: You can manually check the JWT content at https://jwt.io

  return res.status(200).json({ error: false, errormessage: "", token: token_signed });

});



// Add error handling middleware
app.use( (err,req,res,next) => {

  console.log("Request error: ".red + JSON.stringify(err) );
  res.status( err.statusCode || 500 ).json( err );

});


// The very last middleware will report an error 404 
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use( (req,res,next) => {
  res.status(404).json({statusCode:404, error:true, errormessage: "Invalid endpoint"} );
})



// Connect to mongodb and launch the HTTP server trough Express
// by using async promises
mongoose.connect( 'mongodb://localhost:27017/connect4' )
.then( 
  () => {

    console.log("Connected to MongoDB");

    return user.getModel().findOne({});
  }
).then(
  (doc) => {
    if (!doc) {

      console.log("Creating admin user");

      var u = user.newUser({
        username: "admin",
        name: "admin",
        surname: "admin",
      });
    
      u.setModerator();
      u.setPassword("admin");
      u.setDefault();
      u.save()
    } else {
      console.log("Admin user already exists");
    }
    return match.getModel().findOne({});
  }
).then((doc)=>{
  if(!doc){
    //Inserting a test match
    var newmatch = match.getModel().create({
      player1:"pippo",
      player2:"pluto",
      spectators:[[],[]],
      winner:"pluto",
      ended: true
    });

  }else{
    console.log("A match already exists");
  }
}).then(      
  () => {
    let server = http.createServer(app);

    ios = io(server);
    ios.on('connection', function (client) {
      console.log("Socket.io client connected".green);
    });

    server.listen(8080, () => console.log("HTTP Server started on port 8080".green));

    // To start an HTTPS server we create an https.Server instance 
    // passing the express application middleware. Then, we start listening
    // on port 8443 
    
    /*https.createServer({
      key: fs.readFileSync('keys/key.pem'),
      cert: fs.readFileSync('keys/cert.pem')
    }, app).listen(8443);
    */
  }
).catch(
  (err) => {
    console.log("Error Occurred during initialization".red );
    console.log(err);
  }
)