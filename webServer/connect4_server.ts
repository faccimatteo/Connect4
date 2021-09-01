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
import path = require('path');                  // Provides utilities for working with file and directory paths
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
import { Readable } from 'stream';
import { stringify } from 'querystring';
import { resolve } from 'path';

declare global {
  namespace Express {
    interface User {
      id: string,
      username: string,
      name: string,
      surname: string,
      moderator: boolean, 
      firstAccess: boolean,
      profilePic: string,
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

const app = express();

const auth = jwt( {secret: process.env.JWT_SECRET} );
const bodyParser = require('body-parser');

// cors make possibile to send request from a website to another website on the broswer by adding a section on the header
app.use(cors());

// Setting payload size limit
app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({limit: '50mb'}));

// Setting up Pusher 
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: "1242312",
  key: "2eb653c8780c9ebbe91e",
  secret: "cedef58c4729c1d12c7c",
  cluster: "eu",
  useTLS: true
});

app.use( (req,res,next) => {
  console.log("------------------------------------------------".inverse)
  console.log("New request for: "+req.url );
  console.log("Method: "+req.method);
  next();
})

// Adding API routes to express application

// App's root: return to the client every possible endpoints of our app
app.get("/", (req,res) => {
  
  res.status(200).json({
    api_version: "0.0.1",
    endpoints: ["/users", "/matches", "/messages", "/login"]
  })
});

// Main route of users
app.route('/users').get(auth, (req,res,next) => {// Return all users

  if(!req.user.moderator)
    return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().find({}).then((users)=>{
    return res.status(200).json(users);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
}).post((req,res,next) =>{
   // Adding a new user
   if(req.body.username == null || req.body.password == null || req.body.name == null || req.body.surname == null || req.body.profilePic == null) {
    return next({ statusCode:404, error: true, 
      errormessage: "Check fields in body request.\n Fields that must be inserted are: username, password, name, surname, profilePic"} );

    }
    else{
      var u = user.newUser( req.body );

      // Inserting a new user inside the system with a temporaray password
      u.setPassword(req.body.password);
      
      u.name = req.body.name;
      u.surname = req.body.surname;
      // Setting of moderator, this endpoint is used to register moderators and normal users
      u.moderator = false;
      // Setting of firstAccess
      u.firstAccess = true;

      u.setDefault();

      // Uploading user's profile pic as Base64 image
      u.profilePic = req.body.profilePic;

      // Saving the new user on the db 'users'
      u.save().then((data) => {
      
        const tokendata = {
          id: data._id,
          username: data.username,
          moderator: data.moderator,
          firstAccess: true,
        };

        console.log("Registration succedeed. Token has been generatd" );
        const token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });


        return res.status(200).json({ error: false, errormessage: "",message: "User successfully added with the id below", id: data._id, token: token_signed });
      }).catch((reason) => {
          return next({statusCode:500, error:true, errormessage: reason});
      })
    }
});

app.post('/users/addModerator', auth, (req,res,next) => {
  // Adding a new moderator

  if(req.body.username == null || req.body.password == null) {
    return next({ statusCode:404, error: true, 
      errormessage: "Check fields in body request.\n Fields that must be inserted are: username and password"} );

  }

  // Checking if the user who sent the request is a moderator
  if(!req.user.moderator)
    return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});
  else{
    var u = user.newUser(req.body);

    // Inserting a new user inside the system with a temporaray password
    u.setPassword(req.body.password);

    // Set user as a moderator 
    u.moderator = true;

    u.firstAccess = true;
    u.setDefault();

    // Saving the new user on the db 'users'
    u.save().then((data) => {
      return res.status(200).json({ error: false, errormessage: "",message: "Moderator successfully added with the id below", id: data._id });
    }).catch((reason) => {
      // Handle even the case if the user is a duplicate
      return next({statusCode:500, error:true, errormessage: reason.code + ': ' + reason.errmsg});
    })
  }
});

// Endpoint to search user's friend
app.get('/users/searchForUsers', auth, (req,res,next) => {
  var users = []
  if(req.user != null){
    user.getModel().find({}).then((userList)=>{
      userList.forEach(user => {
        users.push({"username":user.username,"picProfile":user.profilePic})
      });

      users.filter((user, index)=>{
        if (user.username == req.user.username){
          // It delete the element in index pos
          users.splice(index, 1)
        }
      })

      // Looking for friend of that user
      user.getModel().findOne({username:req.user.username}).select({friends:1}).then((friendsList)=>{
        for (var i=0; i<users.length; i++) {
          if(friendsList.friends.includes(users[i].username)){
            users.splice(i, 1)
            // We need to check again the next element 
            i--;  
          }
        }
        return res.status(200).json({users: users});
      }).catch((error) => {
        return next({statusCode:error.code, error:true, errormessage: "Couldn't find user's friends"});
      })
    })
  }
  else
    return next({statusCode:500, error:true, errormessage: "User is not defined"});
}) 

// Reset credentials of new moderator
app.post('/users/setModerator/', auth, (req,res,next) => {
  // We reset the password too because the first one was given as a temporary password
  if(req.body.password == null || req.body.name == null || req.body.surname == null || req.body.profilePic == null) {
    return next({ statusCode:404, error: true, 
      errormessage: "Check fields in body request.\n Fields that must be inserted are: name, password, surname and profilePic"} );
  }
  else{
    //getting the use with the username and update the corrispondent fields
    user.getModel().updateOne({username:req.user.username},{$set: {password:req.body.password, name:req.body.name, surname:req.body.surname, profilePic:req.body.profilePic}}, (err, response)=>{
      if(err != null)
        return next({statusCode:400, error:true, errormessage: 'DB error: ' + err});
      else{
        return res.status(200).json({error: false, errormessage:"", message: "User " + req.user.username + " correctly updated"});
      }
    })
  }
  
  
});

app.get('/users/:username/profilepic', auth, (req, res, next) => {
  user.getModel().findOne({username:req.params.username}).then((response) => {
      if (response == null) 
        return next({ statusCode:404, error: true, errormessage: "User " + req.params.username + " not found in DB."});
      else 
        return res.status(200).json({"profilepic": response.profilePic});
      
  }).catch((error) => {
    return next({ statusCode:error.code, error: true, errormessage: "Couldn't get user from DB. " + error.code});
  })
});

app.get('/users/setFirstAccess', auth, (req, res, next) => {
  user.getModel().updateOne({username:req.user.username}, { $set: {firstAccess: false}}, (err, response) => {
      if (err != null) 
        return next({ statusCode:404, error: true, errormessage: "User " + req.user.username + " not found in DB."});
      else{

        const tokendata = {
          id: req.user.id,
          username: req.user.username,
          moderator: req.user.moderator,
          firstAccess: false,
        };

        console.log("Registration succedeed. Token has been generatd" );
        const token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });

        return res.status(200).json({"message": "Correctly setted user first access.", token: token_signed});
      }

        
      
  }).catch((error) => {
    return next({ statusCode:500, error: true, errormessage: "DB error on changing first access." + error});
  })
});


// Return if the user is looking for a match
app.get('/users/getLookingForAMatch', auth, (req,res,next) => {
  
  // Checking if the user is a moderator or the user himself or one of his friends
  if(req.user != null){
    user.getModel().findOne({username:req.user.username}).select({}).then((response)=>{
      return res.status(200).json({lookingForAMatch:response.isLookingForAMatch});
    }).catch((error)=>{
      return next({statusCode:error.code, error: true, errormessage: "Cannot retrieve user " + req.user.username + " from DB."});
    })
  }else{
    return next({statusCode:404, error: true, errormessage: "Cannot access this endpoint"});
  }
    
})

app.get('/users/pairUserForAMatch', auth, (req,res,next) => {

  // Search a user to match with if possible 
  if (req.user != null){
    user.getModel().find().select({}).where('isLookingForAMatch').equals(true).where('username').ne(req.user.username).then((response)=>{
      if (response.length != 0){
        const waitingUsers = response
        const index = Math.floor(Math.random() * waitingUsers.length)
        return res.status(200).json({user:response[index]});
      }else{
        return res.status(200).json({user:null});
      }
    }).catch((error)=>{
      return next({statusCode:error.code, error: true, errormessage: "Cannot get isLookingForAMatch from users from DB"});
    })
  }else{
    return next({statusCode:404, error: true, errormessage: "Cannot access this endpoint"});
  }
})


// Return friends of a certain user
app.get('/users/friendsWithStats', auth, (req,res,next) => {

  var friends_with_stats = []
    const myPromise = new Promise((resolve,reject) => {
      user.getModel().findOne({username:req.user.username}).then((response)=>{
        var myPromises = []
        response.friends.forEach((friend,index) => {
          var getUser = function(value){
            return new Promise((resolve, reject) => {
              user.getModel().findOne({username:friend}).select({win:1,loss:1,draw:1}).then((stats)=>{
              
                friends_with_stats.push({
                  "username":friend,
                    "stats":{
                      "win": stats.win,
                      "loss": stats.loss,
                      "draw": stats.draw,
                    }
                })
                resolve(value)
              }).catch(() => {
                reject(value)
              })
            })
            
          }

          myPromises.push(getUser(index))

        })
        Promise.all(myPromises).then(()=>{
          return res.status(200).json({result:friends_with_stats}); 
        }).catch((reason)=>{
          return next({ statusCode:404, error: true, errormessage: "Error while trying to get user " + req.params.username + ". " + reason});
        })
      })
    })

});


// Return all users with stats
app.get('/users/allUserWithStats', auth, async (req,res,next) => {
  
  // To find user's friends the user that send the request has to be that user
  if(!req.user.moderator)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});
  else{
      var users_with_stats = []
      const myPromise = new Promise((resolve,reject) => {
        user.getModel().find({}).then((response)=>{
          var myPromises = []
          response.forEach((myuser,index) => {
            var getUser = function(value){
              return new Promise((resolve, reject) => {
                user.getModel().findOne({username:myuser.username}).select({win:1,loss:1,draw:1}).then((stats)=>{
                
                  users_with_stats.push({
                    "username":myuser.username,
                      "stats":{
                        "win": stats.win,
                        "loss": stats.loss,
                        "draw": stats.draw,
                      }
                  })
                  resolve(value)
                }).catch(() => {
                  reject(value)
                })
              })
              
            }

            myPromises.push(getUser(index))

          })
          Promise.all(myPromises).then(()=>{
            return res.status(200).json({result:users_with_stats}); 
          }).catch((reason)=>{
            return next({ statusCode:404, error: true, errormessage: "Error while trying to get user " + req.params.username + ". " + reason});
          })
        })
      })
  } 
});

// Main route of users/:username
app.route('/users/:username').get((req,res,next) => {// Return a user with a certain username

  user.getModel().findOne({username: req.params.username}).then((response)=>{
    if(response == null)
      return next({ statusCode:404, error: true, errormessage: "The user you are looking for is not present into the DB"});
    else
      return res.status(200).json({user: response});
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "DB error: " + reason}); 
  })

}).delete(auth, (req,res,next)=>{// Delete a user with a certain username
  // I can remove a user only if I am a moderator
  if(!req.user.moderator)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().findOne({username:req.params.username}).then((result)=>{
    // Checking if the document exists
  if(result == null)
    return next({ statusCode:404, error: true, errormessage: "The user you are looking for is not present into the DB"}); 
    else{
      user.getModel().deleteOne({username:req.params.username}).then(()=>{
        return res.status(200).json('User ' + req.params.username + ' successfully deleted from the DB'); 
      }).catch((reason)=>{
        return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
      })
    }
  })
});

// Return the stats of a certain user
app.get('/users/:username/stats', auth, (req,res,next) => {

  user.getModel().findOne({username:req.params.username}).select({friends:1}).then((friendsList) =>{
    

    // Checking if the user is a moderator or the user himself or one of his friends
    if(!req.user.moderator && (req.params.username != req.user.username) && !((friendsList.friends).includes(req.user.username)))
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: to see this user's statistic you must be that user, a moderator or a friend of that user"});

    user.getModel().findOne({username: req.params.username}).select({win:1,loss:1,draw:1}).then((stats)=>{
      if(stats == null)
        return next({ statusCode:404, error: true, errormessage: "Couldn't load stats of user " + req.params.username});
      else
        return res.status(200).json({stats:stats});

    }).catch((reason)=>{
      return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
    })
  }).catch((error)=>{
    return next({ statusCode:error.code, error: true, errormessage: error}); 
  })

});

// Set if user is looking for a match
app.get('/users/setLookingForAMatch/:value', auth, (req,res,next) => {
  
  // Checking if the user is a moderator or the user himself or one of his friends
  if(req.user != null){
    user.getModel().findOne({username:req.user.username}).select({}).then((response)=>{
      if(response == null)
        return next({statusCode:404, error: true, errormessage: "The user you are looking for is not present into the DB"});
      else{
        const valueToUpdate = (req.params.value =="true")
        user.getModel().updateOne({username:req.user.username}, {$set: {isLookingForAMatch: valueToUpdate}}).then(()=>{
          return res.status(200).json({message: "User state of looking for a match setted: " + req.params.value});
        }).catch((error)=>{
          return next({statusCode:error.code, error: true, errormessage: "Cannot update isLookingForAMatch: " + error});
        }) 
      }
    }).catch((error)=>{
      return next({ statusCode:error.code, error: true, errormessage: "Cannot retrieve isLookingForAMatch for user " + req.user.username});
    })
  }else{
    return next({statusCode:404, error: true, errormessage: "Cannot access this endpoint"});
  }
    
})



// Return friends of a certain user
app.get('/users/:username/friends', auth, (req,res,next) => {
  // To find user's friends the user that send the request has to be that user
  if(req.user.username != req.params.username)
      return next({ statusCode:404, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user"});

  user.getModel().findOne({username: req.params.username}).select({friends:1}).then((user)=>{
    if(user == null)
      return res.status(200).json("The user you are looking for is not present into the DB"); 
    else
      return res.status(200).json(user.friends);
    
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })

});

// Return friends' request of a certain user
app.get('/users/:username/friendsRequests', auth, (req,res,next) => {

  // To find user's friends the user that send the request has to be that user
  if(req.user.username != req.params.username)
    return next({ statusCode:404, error: true, errormessage: "Unauthorized: to see user's friend requests you have to be that user"});

  if (req.user != null)
    user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((userList)=>{
      return res.status(200).json({friendsRequests:userList.pendingRequests});
    })
  else
    return next({ statusCode:404, error: true, errormessage: "Couldn't get user from request"}); 
  
  /*user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((userList)=>{
      (userList.pendingRequests).forEach(friend => {
        user.getModel().findOne({username:friend}).select({profilePic:1}).then((result)=>{
          friends[friend] = result.profilePic
        }).catch(()=>{
          return next({ statusCode:404, error: true, errormessage: "Couldn't get user profilePic"}); 
        })
      });
    return res.status(200).json({friendsRequests:friends});
  }).catch((error)=>{
    return next({ statusCode:404, error: true, errormessage: "Couldn't retrieve user's friendship requests"}); 
  })*/

});

// Send friendship request to user 
app.get('/users/sendFriendship/:username', auth, (req,res,next) => {


  if (req.user != null){
    // Checking if username to add exists
    user.getModel().findOne({username:req.params.username}).then(()=>{
      user.getModel().findOne({username:req.params.username}).select({pendingRequests: 1}).then((result)=>{
        if ((result.pendingRequests).includes(req.params.user))
          return next({ statusCode:404, error: true, errormessage: "Friendship request to user " + req.params.username + " has been already sent"})
        else{
          user.getModel().updateOne({ username: req.params.username}, {$push: {pendingRequests: req.user.username}}).then(()=>{
            return res.status(200).json({message: "Friend request sent to " + req.params.username})
          }).catch((error)=>{
            return next({ statusCode:error.code, error: true, errormessage: "Couldn't send friend request to user " + req.params.username})
          })
        }
      }).catch((error)=>{
        return next({ statusCode:404, error: true, errormessage: "Couldn't get user from DB. " + error.code})
      })
    })
  }else
    return next({ statusCode:404, error: true, errormessage: "Couldn't get user from request"}); 
  
})

// Accept friend request of a certain user
app.get('/users/acceptFriendship/:friend', auth, (req,res,next) => {

  // We check that the friend is inside user's friendRequest list
  if (req.user != null){
    user.getModel().findOne({username:req.params.friend}).then((friendUser)=>{
      user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((friendRequestsList)=>{
        // We update the friend list of the user 
        if ((friendRequestsList.pendingRequests).includes(friendUser.username)){
          user.getModel().findByIdAndUpdate(req.user.id, {$push: {friends: friendUser.username}} ).then(()=>{
            user.getModel().updateOne({username: friendUser.username}, {$push: {friends: req.user.username}} ).then(()=>{
              user.getModel().findByIdAndUpdate(req.user.id, {$pull: {pendingRequests: friendUser.username}}).then(()=>{
                return res.status(200).json({message: "User " + req.user.username + " added friend " + friendUser.username + " correctly" })
              }).catch(()=>{
                return next({ statusCode:404, error: true, errormessage: "Couldn't delete "+ req.params.friend + " from pending requests"}); 
              })
            }).catch(()=>{
              return next({ statusCode:404, error: true, errormessage: "Couldn't add " + req.user.username + " to " + friendUser.username + " friends"});
            })
          }).catch(()=>{
            return next({ statusCode:404, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username}); 
          })
        }
        else
          return next({ statusCode:404, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username}); 
      }).catch(()=>{
        return next({ statusCode:404, error: true, errormessage: "Error while trying to retrieve "+ req.params.friend + " in pending requests"}); 
      })
    }).catch(()=>{
      return next({ statusCode:404, error: true, errormessage: "Couldn't retrive "+ req.params.friend + " from DB"}); 
    })
  }
  else
    return next({ statusCode:404, error: true, errormessage: "Couldn't get user from request"}); 
})

// Accept friend request of a certain user
app.get('/users/rejectFriendship/:friend', auth, (req,res,next) => {

  // We check that the friend is inside user's friendRequest list
  if (req.user != null){
    user.getModel().findOne({username:req.params.friend}).then((friendUser)=>{
      user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((friendRequestsList)=>{
        // We update the friend list of the user 
        if ((friendRequestsList.pendingRequests).includes(friendUser.username)){
            user.getModel().findByIdAndUpdate(req.user.id, {$pull: {pendingRequests: friendUser.username}}).then(()=>{
              return res.status(200).json({message: "User " + req.user.username + " added friend " + friendUser.username + " correctly" })
            }).catch(()=>{
              return next({ statusCode:404, error: true, errormessage: "Couldn't delete "+ req.params.friend + " from pending requests"}); 
            })
        }
        else
          return next({ statusCode:404, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username}); 
      }).catch(()=>{
        return next({ statusCode:404, error: true, errormessage: "Error while trying to retrieve "+ req.params.friend + " in pending requests"}); 
      })
    }).catch(()=>{
      return next({ statusCode:404, error: true, errormessage: "Couldn't retrive "+ req.params.friend + " from DB"}); 
    })
  }
  else
    return next({ statusCode:404, error: true, errormessage: "Couldn't get user from request"}); 
})

// Main route of matches
app.route("/matches").get(auth, (req,res,next) => {// Return all matches 
  // We find all the matches and we output them in JSON format
  match.getModel().find({}).then((matches)=>{
    return res.status(200).json(matches);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
}).post(auth, (req,res,next) => {// Inserting a new match 
   
  // We insert a new match from the data included in the body
  // after checking if all the required fields are present
  if(req.body.player1 == null || req.body.player2 == null )
    return next({ statusCode:404, error: true, errormessage: "Check fields in body request. Fields that must be inserted are: player1, player2"});

  // Checking if players are inserted into a DB
  user.getModel().findOne({username:req.body.player1}).then((result)=>{
    if(result == null)
      return next({statusCode:404, error: true, errormessage: "The user you are trying to insert is not present into the db."});
    else{
      user.getModel().findOne({username:req.body.player2}).then((result)=>{
        if(result == null)
          return next({statusCode:404, error: true, errormessage: "The user you are trying to insert is not present into the db."});
        else{
          // Checking spectators field
          if(req.body.spectators != null){
            if(req.body.spectators[0].length == req.body.spectators[1].length){
              (req.body.spectators[0]).forEach(element => {
                if(typeof element != "string"){
                  return next({statusCode:404, error: true, errormessage: "Spectators field not correctly formatted: must be [string[], boolean[]]"});  
                }else 
                  user.getModel().findOne({username:element}).then((result)=>{
                    if(result == null)
                      return next({statusCode:404, error: true, errormessage: "Spectators field must contain an existent user"});
                  })  
              });
              (req.body.spectators[1]).forEach(element => {
                if(typeof element != "boolean")
                  return next({statusCode:404, error: true, errormessage: "Spectators field not correctly formatted: must be [string[], boolean[]]"});
              });

            }
          }
          // The users are checked, now we can correctly insert the match
          const players = [req.body.player1, req.body.player2];
          
          if(req.body.winner != null || req.body.loser != null){
            if(players.includes(req.body.winner)){
            
              match.getModel().create({
                player1: req.body.player1,
                player2: req.body.player2,
                turn: null,
                spectators: req.body.spectators,
                winner: req.body.winner,
                loser: req.body.loser,
                ended: true
              
              }).then((matchCreated)=>{
                return res.status(200).json({message:'New ended match correctly added', id: matchCreated._id});
              }).catch((reason)=>{
                return next({ statusCode:404, error: true, errormessage: "DB error: " + reason});
              });
            }else{
              return next({ statusCode:404, error: true, errormessage: "winner field must be one of the two players"});
            }
            
          }else{
            const index = Math.floor(Math.random() * 2)
            match.getModel().create({
              player1: req.body.player1,
              player2: req.body.player2,
              turn: players[index],
              spectators: [],
              winner: null,
              loser: null,
              ended: false
            }).then((matchCreated)=>{
              return res.status(200).json({message:'New match correctly added', id: matchCreated._id, match: matchCreated});
            }).catch((reason)=>{
              return next({ statusCode:404, error: true, errormessage: "DB error: " + reason});
            });
          }
        }
      }).catch((reason)=>{
        return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
      })
        
    }
  })
});

// Return all the current matches
app.get("/activeMatches", auth, (req,res,next) => {// Return all matches 
  // We find all the matches and we output them in JSON format
  match.getModel().find({ended:false}).then((matches)=>{
    const matchesArray = [];
    matches.forEach(match => {
      matchesArray.push([match._id, match.player1, match.player2])
    });
    return res.status(200).json(matchesArray);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
})
// Main rout of matches/:id
app.route("/matches/:id").delete(auth,(req,res,next) => {// Delete a certain match given a defined ID
  
  if((req.params.id).length != 24)
    return next({ statusCode:404, error: true, errormessage: "The match id must be 24 character length"}); 

  const myId = mongoose.Types.ObjectId(req.params.id);

  match.getModel().findOne({_id:myId}).then((result)=>{
    
    // Checking if the document exists
    if(result == null)
      return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
    
  }).then(()=>{
    
    // Deleting the existing document 
    match.getModel().deleteOne({_id:myId}).then(()=>{
      return res.status(200).json('The match with the curret id (' + myId +') has been deleted');
    }).catch((reason)=>{
      return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
    });
  })
}).get(auth,(req,res,next) => {// Return a certain match given a defined ID
  
  
  if((req.params.id).length != 24)
    return next({ statusCode:404, error: true, errormessage: "The match id must be 24 character length"}); 

  const myId = mongoose.Types.ObjectId(req.params.id);

  match.getModel().findOne({_id:myId}).then((result)=>{
    // Checking if the document exists
    if(result == null)
      return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
    else{
      return res.status(200).json(result);
    }
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  });
  
})

// Return which players played/ are playing the match
app.get("/matches/:id/players", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({player1:1,player2:1}).then((players)=>{
    const p = [players.player1, players.player2]
    res.status(200).json({players:p});
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Return which players are watching the match
app.get("/matches/:id/observers", auth, (req,res,next) => {

  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({spectators:1}).then((observers)=>{
    
    // Checking if the match exists
    if(observers == null)
      return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
    
    // Extracting only the users that are currently wacthing the match
    const ourObservers = [];
    for(var i=0;i<observers.spectators[1].length;i++){
      if(observers.spectators[1][i])
        // If the spectator is currently watching the match is added to indexes
        ourObservers.push(observers.spectators[0][i]);
    }

    return res.status(200).json({"observers": ourObservers});
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Add a spectator to a certain match
app.post("/matches/:id/addSpectator/:username", auth, (req,res,next) => {

  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({spectators:1}).then((observers)=>{
    
    // Checking if the match exists
    if(observers == null)
      return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
    
    // If the request doesn't have the username field
    if(req.params.username == null)
      return next({ statusCode:404, error: true, errormessage: "You need to specify the user in the request with 'username'"});
    
    user.getModel().findOne({username:req.body.username}).then((result)=>{
      
      // If username is not present inside the DB
      if(result == null)
        return next({ statusCode:404, error: true, errormessage: "The user you've tried to add is not a DB's user"});
      else{

        // Spectators' array modified with the added spectator
        var newArray = observers.spectators;

        newArray[0].push(req.params.username);
        newArray[1].push(true);
      

        // Adding spectators to the match 
        match.getModel().updateOne({ _id: myId}, { $set: { spectators:  newArray} }).then(()=>{
          return res.status(200).json('Spectator ' +req.params.username + ' has been successfully added.');
        }).catch((reason)=>{
          return next({ statusCode:404, error: true, errormessage: "DB error: " + reason});
        });
      }
    })
  
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Add spectators to a certain match
app.post("/matches/:id/addSpectators", auth, (req,res,next) => {

  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({spectators:1}).then((observers)=>{
    
    // Checking if the match exists
    if(observers == null)
      return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
    else{

      // Checking if the users are present into the DB
      for(let spect in req.body.usernames){
        user.getModel().findOne({username:spect}).then((result)=>{
          if(result == null)
            return next({ statusCode:404, error: true, errormessage: "The user " + req.body.usernames[spect] + " is not present into the DB"});    
          else{
            // Adding the relative spectator to the match
            observers.spectators[0].push(spect);
            observers.spectators[1].push(true);

             // Spectators' array modified with the added spectator
              var newArray = observers.spectators;

              // Adding spectators to the match 
              match.getModel().updateOne({ _id: myId}, { $set: { spectators:  newArray} }).then(()=>{
                return res.status(200).json('Spectators ' + req.body.usernames + ' have been successfully added.');
              }).catch((reason)=>{
                return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
              })
              
          }
        })
      }
    } 
  })
});

// Return which players have seen the match
app.get("/matches/:id/spectators", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({spectators:1}).then((spectators)=>{
    return res.status(200).json(spectators);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Set that a spectator is not watching a match anymore
app.delete("/matches/:id/:username", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({spectators:1}).then((observers)=>{
    
    // Checking if the match exists
    if(observers == null)
      return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
    
    user.getModel().findOne({username:req.body.username}).then((result)=>{
      
      // If username is not present inside the DB
      if(result == null)
        return next({ statusCode:404, error: true, errormessage: "The user you've tried to delete is not a DB's user"});
      else{

        // Spectators' array modified with the added spectator
        var newArray = observers.spectators;
        newArray[1][newArray[0].indexOf(req.params.username)] = false;

        // Adding spectators to the match 
        match.getModel().updateOne({ _id: myId}, { $set: { spectators:  newArray} }).then(()=>{
          return res.status(200).json('Spectator ' +req.params.username + ' is not watching the match anymore');
        }).catch((reason)=>{
          return next({ statusCode:404, error: true, errormessage: "DB error: " + reason});
        });
      }
    })
  
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Return who is allowed to do the next move
app.get("/matches/:id/turn", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findById(myId, (err,result)=>{
    if(err != null)
      return next({ statusCode:err.code, error: true, errormessage: "Match " + myId + " not found"}); 
    else
      return res.status(200).json({turn:result.turn});
  }).catch((reason)=>{
    return next({ statusCode:reason.code, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Return the winner of a match
app.get("/matches/:id/winner", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({winner:1}).then((result)=>{
    return res.status(200).json({"winner":result.winner});
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// TODO: we need to make secure this get request
// Set the match drawn
app.get("/matches/:id/setDraw", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  // Looking for a certain match
  match.getModel().findOne({_id:myId}).then((result)=>{
    
    if(result == null)
      return next({ statusCode:404, error: true, errormessage: "The match is not present inside the DB"});
    else{

      // Checking if players are inserted into a DB
      match.getModel().findOne({_id:myId}).select({player1:1,playe2:1}).then((result)=>{
        const players = [result.player1, result.player2]
          
          // If the control flow pass, set the winner of the match
          match.getModel().updateOne({ _id:myId}, { $set: { winner: null, ended: true} }).then(()=>{
            
            user.getModel().updateOne({username:result.player1}, { $inc: { draw:1 }}).then(()=>{
              user.getModel().updateOne({username:result.player2}, { $inc: { draw:1 }}).then(()=>{
                return res.status(200).json({message: 'Added draw to ' + result.player1 + ' and ' + result.player2 + ' then setted the match ' + myId + ' drawn.'});
              }).catch((err)=>{
                return next({ statusCode:err.code, error: true, errormessage: "Couldn't update " + result.player1 + " stats"});
              })
            }).catch((err)=>{
              return next({ statusCode:err.code, error: true, errormessage: "Couldn't update " + result.player1 + " stats"});
            })

          }).catch((err)=>{
              return next({ statusCode:err.code, error: true, errormessage: "DB error: " + err});
          });
          
        }).catch((err)=>{
            return next({ statusCode:err.code, error: true, errormessage: "DB error: " + err});
        });    
      
    }
  })
})

// Set the loser of the match
app.get("/matches/:id/setLoser", auth, (req,res,next) => {
    
  const myId = mongoose.Types.ObjectId(req.params.id);
  // Looking for a certain match
  match.getModel().findOne({_id:myId}).then((result)=>{
    
    if(result == null)
      return next({ statusCode:404, error: true, errormessage: "The match is not present inside the DB"});
    else{

      // Checking if players are inserted into a DB
      match.getModel().findOne({_id:myId}).select({}).then((result)=>{
        if(result.ended){
          return next({ statusCode:404, error: true, errormessage: "Cannot set winner/loser of a match aready ended"});
        }
        else{
          const players = [result.player1, result.player2]
          
          // getting other player in match
          const opponent = players[players.indexOf(req.user.username) == 1 ? 0 : 1];

          if(!players.includes(req.user.username))
            return res.status(200).json({message:"The user you are trying to insert is not present into the db or is not equal to one of the two match's players."});
          else{
            // incrementing user losses
            user.getModel().updateOne({username:req.user.username}, { $inc: { loss: 1 }}, (err) =>{
              if(err != null)
                return next({statusCode:err.code, error: true, errormessage: "DB error: " + err});
              else{
                // incrementing user wins
                user.getModel().updateOne({username:opponent}, { $inc: { win: 1 }}, (err)=>{
                  // If the control flow pass, set the loser of the match, set the match winner, the match is ended and make the turn null
                  if(err != null)
                    return next({statusCode:err.code, error: true, errormessage: "DB error: " + err});
                  else{
                    match.getModel().updateOne({ _id: myId}, {$set: {loser: req.user.username, winner: opponent, ended: true, turn:null}}, (err)=>{
                      if(err != null)
                        return next({statusCode:err.code, error: true, errormessage: "DB error: " + err});
                      else {
                        return res.status(200).json({
                          message:'Winner ' + opponent + ' of match ' + req.params.id + ' setted correcty.\n Loser ' + req.user.username + ' of match ' + req.params.id + ' setted correcty.'});                            
                      }
                    
                  });
                }
              })
              }
            })
          }
        }
        
      }).catch((reason)=>{
          return next({ statusCode:404, error: true, errormessage: "DB error: " + reason});
      });    
      
    }
  })
    
})

// We want to know the loser of a match
app.get("/matches/:id/loser", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({loser:1}).then((loser)=>{
    return res.status(200).json({"loser ":loser});
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "DB error: " + reason}); 
  })
});

// Pusher chat API
app.post("/messages", auth, (req,res,next) => {
  if(req.body.message == null || req.body.id == null || req.body.type == null){
    return next({ statusCode:404, error: true, errormessage: "Body must contain message, id and type fields"});
  }else{

    pusher.trigger("chat" + req.body.id + req.body.type, "message", {
      username: req.user.username,
      message: req.body.message
    });
    return res.status(200).json({username:req.user.username, message:req.body.message});
  }
  
})

// Pusher finding match API
app.post("/matchFound", auth, (req,res,next) => {
  if(req.body.matchId == null || req.body.challenged == null)
    return next({ statusCode:404, error: true, errormessage: "Body must contain challenged and matchId fields"});
  else{
    match.getModel().findById(req.body.matchId,(err) => {
      if(err != null)
        return next({statusCode:err.code, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{
        user.getModel().findOne({username:req.body.challenged}).then((response) => {
          if(response == null){
            return next({ statusCode:404, error: true, errormessage: "Username " + req.body.challenged + " has not found into the DB."});
          }else{
            pusher.trigger("lookingForAMatch", "matchFound", {
              username: req.user.username,
              challenged: req.body.challenged,
              matchId: req.body.matchId
            });
            return res.status(200).json({message:"match found", username: req.user.username, against:req.body.challenged});
          }
        }).catch((error) => {
          return next({statusCode:error.code, error: true, errormessage: "Canonot find match " + req.body.matchId + " from DB."});
        })
      }
    }).catch((error) => {
      return next({statusCode:error.code, error: true, errormessage: "Cannot connect to DB."});
    })
  }
  
})

// Pusher Connect4 API to make a move
app.post("/doMove", auth, (req,res,next) => {
  console.log(req)
  if(req.body.matchId == null || req.body.columnIndex == null)
    return next({ statusCode:404, error: true, errormessage: "Body must contain matchId and columnIndex fields"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:err.code, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{
        const allowed_players = [result.player1, result.player2];
        // Checking if player is allowed 
        if(!allowed_players.includes(req.user.username)){
          return next({ statusCode:404, error: true, errormessage: "User " + req.user.username + " is not allowed to play the game"});
        }
        else{
          // Checking if the user is allowed to play at this time
          if(req.user.username != result.turn)
            return next({ statusCode:404, error: true, errormessage: "You're not allowed to do a move at the moment"});
          else{
          
            // We check that to column is correct 
            if(req.body.columnIndex < 0 || req.body.columnIndex > 6)
              return next({ statusCode:404, error: true, errormessage: "columnIndex must be between 0 and 6 to make a move"});
            else{ 
              // We take the user that is currently waiting for his turn
              const user_turn= allowed_players.indexOf(req.user.username) == 0 ? allowed_players[1] : allowed_players[0]
              match.getModel().updateOne({_id: req.body.matchId}, {$set: {turn: user_turn}}).then(() => {
                // Sending event trigger on pusher 
                pusher.trigger(req.body.matchId, "nextMove", {
                  playerIndex: allowed_players.indexOf(req.user.username),
                  columnIndex: req.body.columnIndex,
                });
                return res.status(200).json({message:"move executed on match " + req.body.matchId + " and updated turn, now is " + user_turn + " turn.", columnIndex: req.body.columnIndex, playerIndex:req.user.username});
              }).catch((error) => {
                return next({statusCode:error.code, error: true, errormessage: "Canonot update match " + req.body.matchId + " in DB."});
              })
            }
          }
        }
      }
    }).catch((error) => {
      return next({statusCode:error.code, error: true, errormessage: "Cannot connect to DB."});
    })
  }
})

// Pusher Connect4 API to communicate the loss
app.post("/communicateLoss", auth, (req,res,next) => {
  
  if(req.body.matchId == null)
    return next({ statusCode:404, error: true, errormessage: "Body must contain matchId field"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:err.code, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{
        const allowed_players = [result.player1, result.player2];
        // Checking if player is allowed 
        if(!allowed_players.includes(req.user.username)){
          return next({ statusCode:404, error: true, errormessage: "User " + req.user.username + " is not allowed to play the game"});
        }
        else{
          
          // Sending event trigger on pusher 
          pusher.trigger(req.body.matchId, "communicateLoss", {
            winner: allowed_players[allowed_players.indexOf(req.user.username) == 1 ? 0:1],
            loser: req.user.username
          });
          return res.status(200).json({
            message:"User " + req.user.username + " has declared his loss",
            winner:allowed_players[allowed_players.indexOf(req.user.username) == 1 ? 0:1],
            loser:req.user.username
          });
        }
      }
    }).catch((error) => {
      return next({statusCode:error.code, error: true, errormessage: "Cannot connect to DB."});
    })
  }
})

// Pusher Connect4 API useful to a spectator to request the match state
app.post("/requestState", auth, (req,res,next) => {
  
  if(req.body.matchId == null)
    return next({ statusCode:404, error: true, errormessage: "Body must contain matchId field"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:err.code, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{

        // Sending event trigger on pusher 
        pusher.trigger(req.body.matchId, "requestState", {
        });
        return res.status(200).json({
          message:"User " + req.user.username + " has requested to spectate the match",
        });
      }
    }).catch((error) => {
      return next({statusCode:error.code, error: true, errormessage: "Cannot connect to DB."});
    })
  }
})

// Pusher Connect4 API useful to a player to send the match state
app.post("/sendState", auth, (req,res,next) => {
  
  if(req.body.matchId == null || req.body.currentBoard == null)
    return next({ statusCode:404, error: true, errormessage: "Body must contain matchId and currentBoard fields"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:err.code, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{
        const allowed_players = [result.player1, result.player2];
        // Checking if player is allowed 
        if(!allowed_players.includes(req.user.username)){
          return next({ statusCode:404, error: true, errormessage: "User " + req.user.username + " is not allowed to send configuration"});
        }else{
          // Sending event trigger on pusher 
          pusher.trigger(req.body.matchId, "sendState", {
            // We need to put the current configuration here 
            currentBoard: req.body.currentBoard
          });
          return res.status(200).json({
            message:"User " + req.user.username + " has requested to spectate the match",
          });
        }
      }
    }).catch((error) => {
      return next({statusCode:error.code, error: true, errormessage: "Cannot connect to DB."});
    })
  }
})


// Using HTTP basic authentication strategy with passport middleware.
passport.use( new passportHTTP.BasicStrategy(
  function(usersname,password, done) {

    // "done" callback (verify callback) documentation:  http://www.passportjs.org/docs/configure/

    // Delegate function we provide to passport middleware
    // to verify user credentials 

    console.log("New login attempt from ".green + usersname );
    
    user.getModel().findOne( {username: usersname} , (err, user)=>{
      if(err) {
        return done( {statusCode: 500, error: true, errormessage:err} );
      }

      if(!user) {
        return done(null,false,{statusCode: 500, error: true, errormessage:"User not exists"});
      }

      if(user.validatePassword(password) ) {
        return done(null, user);
      }

      return done(null,false,{statusCode: 500, error: true, errormessage:"Password is not correct"});
    })
  }
));


// Login endpoint uses passport middleware to check
// user credentials before generating a new JWT
app.get("/login", passport.authenticate('basic', { session: false }), (req,res,next) => {

  const tokendata = {
    id: req.user.id,
    username: req.user.username,
    moderator: req.user.moderator,
    firstAccess: req.user.firstAccess
  };

  console.log("Login granted. Token has been generated" );
  const token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });

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
mongoose.connect( 'mongodb://localhost:27017/connect4' , { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify:false })
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
  }).then(      
  () => {
    let server = http.createServer(app);

    const ios = io(server);
    ios.on('connection', function (client) {
      console.log("Socket.io client connected".green);
    });

    server.listen(8080, () => console.log("HTTP Server started on port 8080".green));

    // To start an HTTPS server we create an https.Server instance 
    // passing the express application middleware. Then, we start listening
    // on port 8443 
    
    https.createServer({
      key: fs.readFileSync('keys/key.pem'),
      cert: fs.readFileSync('keys/cert.pem')
    }, app).listen(8443);
    
  }
).catch(
  (err) => {
    console.log("Error Occurred during initialization".red );
    console.log(err);
  }
)