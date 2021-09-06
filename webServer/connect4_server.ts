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
import * as match from './matches';
import * as user from './users';

import express = require('express');

import passport = require('passport');           // authentication middleware for Express
import passportHTTP = require('passport-http');  // implements Basic and Digest authentication for HTTP (used for /login endpoint)

import jsonwebtoken = require('jsonwebtoken');  // JWT generation
import jwt = require('express-jwt');            // JWT parsing middleware for express

import cors = require('cors');                  // Enable CORS middleware 

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

// App's root: return to the client every possible endpoints of our app
app.get("/", (req,res) => {
  
  res.status(200).json({
    api_version: "0.0.1",
    endpoints: [
                "/users", '/users/addModerator', '/users/searchForUsers', '/users/setModerator/', '/users/:username/profilepic', '/users/setFirstAccess', 
                '/users/pairUserForAMatch', '/users/friendsWithStats', '/users/allUserWithStats', '/users/:username', '/users/:username/stats',
                '/users/setLookingForAMatch/:value', '/users/:username/friends', '/users/:username/friendsRequests','/users/sendFriendship/:username',
                '/users/acceptFriendship/:friend', '/users/rejectFriendship/:friend', 
                "/matches", "/activeMatches", "/matches/:id", "/matches/:id/players", "/matches/:id/turn", "/matches/:id/setDraw","/matches/:id/setLoser",
                "/messages", "/matchFound", "/doMove", "/communicateLoss", "/requestState", "/sendState", "/friendRequests", 
                "/login"]
  })
});

// Main route of users
app.route('/users').get(auth, (req,res,next) => {// Return all users

  if(!req.user.moderator)
    return next({ statusCode:401, error: true, errormessage: "Unauthorized: user is not a moderator"});

  user.getModel().find({}).then((users)=>{
    return res.status(200).json(users);
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to find users: " + reason}); 
  })
}).post((req,res,next) =>{
   // Adding a new user
   if(req.body.username == null || req.body.password == null || req.body.name == null || req.body.surname == null || req.body.profilePic == null) {
    return next({ statusCode:400, error: true, 
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
      u.firstAccess = false;

      u.setDefault();

      // Uploading user's profile pic as Base64 image
      u.profilePic = req.body.profilePic;

      // Saving the new user on the document 'users'
      u.save().then((data) => {
      
        const tokendata = {
          id: data._id,
          username: data.username,
          moderator: data.moderator,
          firstAccess: false,
        };

        console.log("Registration succedeed. Token has been generatd" );
        const token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });

        return res.status(200).json({ error: false, errormessage: "",message: "User successfully added with the id below", id: data._id, token: token_signed });
      }).catch((reason) => {
          return next({statusCode:500, error:true, errormessage: "Error while trying to register a user: " + reason});
      })
    }
});

app.post('/users/addModerator', auth, (req,res,next) => {
  
  // Adding a new moderator
  if(req.body.username == null || req.body.password == null) {
    return next({ statusCode:400, error: true, 
      errormessage: "Check fields in body request.\n Fields that must be inserted are: username and password"} );

  }

  // Checking if the user who sent the request is a moderator
  if(!req.user.moderator)
    return next({ statusCode:401, error: true, errormessage: "Unauthorized: user is not a moderator"});
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
      return next({statusCode:500, error:true, errormessage: "Error while trying to register a moderator: " + reason});
    })
  }
});

// Endpoint to search user's friends
app.get('/users/searchForUsers', auth, (req,res,next) => {
  var users = []
    user.getModel().find({}).then((userList)=>{
      userList.forEach(user => {
        users.push({"username":user.username,"picProfile":user.profilePic})
      });

      users.filter((user, index)=>{
        // We do not have to return ourself
        if (user.username == req.user.username){
          // It deletes the element in index pos
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
        return next({statusCode:404, error:true, errormessage: "Couldn't find user's friends. " + error});
      })
    }).catch((error) => {
      return next({statusCode:404, error:true, errormessage: "Couldn't find users in DB"  + error});
    })
}) 

// Reset credentials of new moderator
app.post('/users/setModerator/', auth, (req,res,next) => {
  // We reset the password too because the first one was given as a temporary password
  if(req.body.password == null || req.body.name == null || req.body.surname == null || req.body.profilePic == null) {
    return next({ statusCode:400, error: true, 
      errormessage: "Check fields in body request.\n Fields that must be inserted are: name, password, surname and profilePic"} );
  }
  else{
    //getting the use with the username and update the corrispondent fields
    user.getModel().updateOne({username:req.user.username},{$set: {password:req.body.password, name:req.body.name, surname:req.body.surname, profilePic:req.body.profilePic}}, null, (err, response)=>{
      if(err != null)
        return next({statusCode:500, error:true, errormessage: 'Error while trying to reset credentials: ' + err});
      else{
        return res.status(200).json({error: false, errormessage:"", message: "User " + req.user.username + " correctly updated"});
      }
    })
  }
  
  
});

// Getting user profilepic in base64
app.get('/users/:username/profilepic', auth, (req, res, next) => {
  user.getModel().findOne({username:req.params.username}).then((response) => {
      if (response == null) 
        return next({ statusCode:404, error: true, errormessage: "User " + req.params.username + " not found in DB." + response});
      else 
        return res.status(200).json({"profilepic": response.profilePic});
      
  }).catch((error) => {
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get profilepic: " + error});
  })
});

// Used after the first access of a user to set a new token
app.get('/users/setFirstAccess', auth, (req, res, next) => {
  user.getModel().updateOne({username:req.user.username}, { $set: {firstAccess: false}}, null,  (err) => {
      if (err != null) 
        return next({ statusCode:404, error: true, errormessage: "User " + req.user.username + " not found in DB. " + err});
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
    return next({ statusCode:500, error: true, errormessage: "Error while trying to set user's first access: " + error});
  })
});

// We pair a user with a random one searching in a match
app.get('/users/pairUserForAMatch', auth, (req,res,next) => {

  // Search a user to match with if possible 
  user.getModel().find().select({}).where('isLookingForAMatch').equals(true).where('username').ne(req.user.username).then((response)=>{
    if (response.length != 0){
      const waitingUsers = response
      const index = Math.floor(Math.random() * waitingUsers.length)
      return res.status(200).json({user:response[index]});
    }else{
      return res.status(200).json({user:null});
    }
  }).catch((error)=>{
    return next({statusCode:500, error: true, errormessage: "Error while trying to pair user for a match: " + error});
  })
  
})


// Return friends of a certain user with stats associated
app.get('/users/friendsWithStats', auth, (req,res,next) => {

  var friends_with_stats = []
    // We need to make multiple promises for every observable returned
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
        // We wait for every promise to complete
        Promise.all(myPromises).then(()=>{
          return res.status(200).json({result:friends_with_stats}); 
        }).catch((reason)=>{
          return next({ statusCode:500, error: true, errormessage: "Error while trying to get result from a promise: " + reason});
        })
      })
    })

});


// Return all users with stats
app.get('/users/allUserWithStats', auth, async (req,res,next) => {
  
  // To find user's friends the user that send the request has to be that user
  if(!req.user.moderator)
      return next({ statusCode:401, error: true, errormessage: "Unauthorized: user is not a moderator"});
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
            return next({ statusCode:500, error: true, errormessage: "Error while trying to get value from a promise: " + reason});
          })
        }).catch((reason)=>{
          return next({ statusCode:500, error: true, errormessage: "Error while trying to get user from DB: " + reason}); 
        })      
      })
  } 
});

// Return a user with a certain username
app.route('/users/:username').get((req,res,next) => {

  user.getModel().findOne({username: req.params.username}).then((response)=>{
    if(response == null)
      return next({ statusCode: 404, error: true, errormessage: "The user you are looking for is not present into the DB"});
    else
      return res.status(200).json({user: response});
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get user: " + reason}); 
  })

}).delete(auth, (req,res,next)=>{// Delete a user with a certain username
  // I can remove a user only if I am a moderator
  if(!req.user.moderator)
      return next({ statusCode:401, error: true, errormessage: "Unauthorized: user is not a moderator"});
  else{
    user.getModel().findOne({username:req.params.username}).then((result)=>{
      // Checking if the document exists
      if(result == null)
        return next({ statusCode:404, error: true, errormessage: "The user you are looking for is not present into the DB"}); 
      else{
        user.getModel().deleteOne({username:req.params.username}).then(()=>{
          return res.status(200).json({"message": 'User ' + req.params.username + ' successfully deleted from the DB'}); 
        }).catch((reason)=>{
          return next({ statusCode:500, error: true, errormessage: "Error while trying to get user " + req.params.username + " : " + reason}); 
        })
      }
    })
  }
});

// Return the stats of a certain user
app.get('/users/:username/stats', auth, (req,res,next) => {

  user.getModel().findOne({username:req.params.username}).select({friends:1}).then((friendsList) =>{
    

    // Checking if the user is a moderator or the user himself or one of his friends
    if(!req.user.moderator && (req.params.username != req.user.username) && !((friendsList.friends).includes(req.user.username)))
      return next({ statusCode:401, error: true, errormessage: "Unauthorized: to see this user's statistic you must be that user, a moderator or a friend of that user"});
    else{
      user.getModel().findOne({username: req.params.username}).select({win:1,loss:1,draw:1}).then((stats)=>{
        if(stats == null)
          return next({ statusCode:404, error: true, errormessage: "Couldn't load stats of user " + req.params.username});
        else
          return res.status(200).json({stats:stats});
  
      }).catch((reason)=>{
        return next({ statusCode:500, error: true, errormessage: "Error while trying to get user " + req.params.username + " and his stats: " + reason}); 
      })
    }
  }).catch((error)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get user " + req.params.username + " friends: " + error}); 
  })

});

// Set if user is looking for a match
app.get('/users/setLookingForAMatch/:value', auth, (req,res,next) => {
  
  user.getModel().findOne({username:req.user.username}).select({}).then((response)=>{
    if(response == null)
      return next({statusCode:404, error: true, errormessage: "The user you are looking for is not present into the DB"});
    else{
      const valueToUpdate = (req.params.value =="true")
      user.getModel().updateOne({username:req.user.username}, {$set: {isLookingForAMatch: valueToUpdate}}).then(()=>{
        return res.status(200).json({message: "User state of looking for a match setted: " + req.params.value});
      }).catch((error)=>{
        return next({statusCode:500, error: true, errormessage: "Cannot update isLookingForAMatch: " + error});
      }) 
    }
  }).catch((error)=>{
    return next({ statusCode:500, error: true, errormessage: "Cannot retrieve isLookingForAMatch for user " + req.user.username + ". " + error});
  })

    
})

// Return friends of a certain user
app.get('/users/:username/friends', auth, (req,res,next) => {
  // To find user's friends the user that send the request has to be that user
  if(req.user.username != req.params.username)
      return next({ statusCode:401, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user"});
  else{
    user.getModel().findOne({username: req.params.username}).select({friends:1}).then((user)=>{
      if(user == null)
        return res.status(200).json("The user you are looking for is not present into the DB"); 
      else
        return res.status(200).json(user.friends);
      
    }).catch((reason)=>{
      return next({ statusCode:500, error: true, errormessage: "Error while trying to get user " + req.params.username + " friends: " + reason}); 
    })
  } 

});

// Return friends' requests of a certain user
app.get('/users/:username/friendsRequests', auth, (req,res,next) => {

  // To find user's friends the user that send the request has to be that user
  if(req.user.username != req.params.username)
    return next({ statusCode:401, error: true, errormessage: "Unauthorized: to see user's friend requests you have to be that user"});
  else {
      user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((userList)=>{
        return res.status(200).json({friendsRequests:userList.pendingRequests});
      }).catch((err) => {
        return next({ statusCode:500, error: true, errormessage: "Couldn't get user from request. " + err});
      })
  }
});

// Send friendship request to user 
app.get('/users/sendFriendship/:username', auth, (req,res,next) => {

  // Checking if username to add exists
  user.getModel().findOne({username:req.params.username}).then(()=>{
    user.getModel().findOne({username:req.params.username}).select({pendingRequests: 1}).then((result)=>{
      if ((result.pendingRequests).includes(req.params.user))
        return next({ statusCode:501, error: true, errormessage: "Friendship request to user " + req.params.username + " has been already sent"})
      else{
        user.getModel().updateOne({ username: req.params.username}, {$push: {pendingRequests: req.user.username}}).then(()=>{
          return res.status(200).json({message: "Friend request sent to " + req.params.username})
        }).catch((error)=>{
          return next({ statusCode:500, error: true, errormessage: "Couldn't send friend request to user " + req.params.username + ". " + error})
        })
      }
    }).catch((error)=>{
      return next({ statusCode:500, error: true, errormessage: "Error while trying to get user " + req.params.username + " pending requests: " + error})
    })
  }).catch((error)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get user " + req.params.username + ": " + error})
  })
})

// Accept friend request of a certain user
app.get('/users/acceptFriendship/:friend', auth, (req,res,next) => {

  user.getModel().findOne({username:req.params.friend}).then((friendUser)=>{
    user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((friendRequestsList)=>{
      // We update the friend list of the user 
      if ((friendRequestsList.pendingRequests).includes(friendUser.username)){
        user.getModel().findByIdAndUpdate(req.user.id, {$push: {friends: friendUser.username}}, (err)=>{
          if(err != null)
            return next({ statusCode:500, error: true, errormessage: "Error while trying to update user " + req.user.username + " friends: " + err}); 
          else{
            user.getModel().updateOne({username: friendUser.username}, {$push: {friends: req.user.username}},null, (err)=>{
              if (err != null){
                return next({ statusCode:500, error: true, errormessage: "Error while trying to update user " + friendUser.username + " friends: " + err}); 
              }
              else{
                user.getModel().findByIdAndUpdate(req.user.id, {$pull: {pendingRequests: friendUser.username}},(err)=>{
                  if(err != null)
                    return next({ statusCode:500, error: true, errormessage: "Error while trying to update user " + req.user.username + " pending requests: " + err}); 
                  else{
                    return res.status(200).json({message: "User " + req.user.username + " added friend " + friendUser.username + " correctly" })
                  }
                })
              } 
            })
          }  
        })
      }
      else
        return next({ statusCode:501, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username}); 
    })
  }).catch((error)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to accept user: " + error}); 
  })
  
})

// Reject friend request of a certain user
app.get('/users/rejectFriendship/:friend', auth, (req,res,next) => {

  user.getModel().findOne({username:req.params.friend}).then((friendUser)=>{
    user.getModel().findOne({username:req.user.username}).select({pendingRequests:1}).then((friendRequestsList)=>{
      // We update the friend list of the user 
      if ((friendRequestsList.pendingRequests).includes(friendUser.username)){
          user.getModel().findByIdAndUpdate(req.user.id, {$pull: {pendingRequests: friendUser.username}}).then(()=>{
            return res.status(200).json({message: "User " + req.user.username + " added friend " + friendUser.username + " correctly" })
          }).catch((error)=>{
            return next({ statusCode:500, error: true, errormessage: "Couldn't delete "+ req.params.friend + " from pending requests. " + error}); 
          })
      }
      else
        return next({ statusCode:501, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username}); 
    }).catch((error)=>{
      return next({ statusCode:500, error: true, errormessage: "Error while trying to retrieve "+ req.params.friend + " in pending requests" + error}); 
    })
  }).catch((error)=>{
    return next({ statusCode:500, error: true, errormessage: "Couldn't retrive "+ req.params.friend + " from DB: " + error}); 
  })

})

// Main route of matches
app.route("/matches").get(auth, (req,res,next) => {// Return all matches 
  // We find all the matches and we output them in JSON format
  match.getModel().find({}).then((matches)=>{
    return res.status(200).json(matches);
  }).catch((reason)=>{
    return next({ statusCode:404, error: true, errormessage: "Couldn't get the matches: " + reason}); 
  })
}).post(auth, (req,res,next) => {// Inserting a new match 
   
  // We insert a new match from the data included in the body
  // after checking if all the required fields are present
  if(req.body.player1 == null || req.body.player2 == null || req.body.private == null)
    return next({ statusCode:400, error: true, errormessage: "Check fields in body request. Fields that must be inserted are: player1, player2, private"});

  // Checking if players are inserted into a DB
  user.getModel().findOne({username:req.body.player1}).then((result)=>{
    if(result == null)
      return next({statusCode:404, error: true, errormessage: "The user you are trying to insert is not present into the db."});
    else{
      user.getModel().findOne({username:req.body.player2}).then((result)=>{
        if(result == null)
          return next({statusCode:404, error: true, errormessage: "The user you are trying to insert is not present into the db."});
        else{
          // The users are checked, now we can correctly insert the match
          const players = [req.body.player1, req.body.player2];
          
          const index = Math.floor(Math.random() * 2)
          match.getModel().create({
            player1: req.body.player1,
            player2: req.body.player2,
            turn: players[index],
            winner: null,
            loser: null,
            ended: false,
            private: req.body.private,
          }).then((matchCreated)=>{
            return res.status(200).json({message:'New match correctly added', id: matchCreated._id, match: matchCreated});
          }).catch((reason)=>{
            return next({ statusCode:404, error: true, errormessage: "Couldn't create the match: " + reason});
          });
        }
        
      }).catch((reason)=>{
        return next({ statusCode:500, error: true, errormessage: "Error while trying to get the user " + req.body.player2 + ": " + reason}); 
      })
  
    }
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get the user " + req.body.player1 + ": " + reason}); 
  })
});

// Return all the active matches
app.get("/activeMatches", auth, (req,res,next) => {
  // We find all the not ended matches and not private then we output them in JSON format
  match.getModel().find({ended:false, private:false}).then((matches)=>{
    const matchesArray = [];
    matches.forEach(match => {
      matchesArray.push([match._id, match.player1, match.player2])
    });
    return res.status(200).json(matchesArray);
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get active matches: " + reason}); 
  })
})


// Return a certain match given a defined ID
app.get("/matches/:id", auth,(req,res,next) => {// Return a certain match given a defined ID
  
  
  if((req.params.id).length != 24)
    return next({ statusCode:501, error: true, errormessage: "The match id must be 24 character length"}); 
  else{
    const myId = mongoose.Types.ObjectId(req.params.id);

    match.getModel().findOne({_id:myId}).then((result)=>{
      // Checking if the document exists
      if(result == null)
        return next({ statusCode:404, error: true, errormessage: "The match you are looking for is not present into the DB"}); 
      else{
        return res.status(200).json(result);
      }
    }).catch((reason)=>{
      return next({ statusCode:500, error: true, errormessage: "Error while trying to get the match " + req.params.id + " : " + reason}); 
    });
  }
})

// Return which players are playing the match
app.get("/matches/:id/players", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findOne({_id:myId}).select({player1:1,player2:1}).then((players)=>{
    return res.status(200).json({players:[players.player1, players.player2]});
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get the match " + req.params.id + " : " + reason}); 
  })
});

// Return who is allowed to do the next move
app.get("/matches/:id/turn", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  match.getModel().findById(myId, (err,result)=>{
    if(err != null)
      return next({ statusCode:404, error: true, errormessage: "Match " + myId + " not found: " + err}); 
    else
      return res.status(200).json({turn:result.turn});
  }).catch((reason)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to get match " + req.params.id + " turn : " + reason}); 
  })
});

// Set the match drawn
app.get("/matches/:id/setDraw", auth, (req,res,next) => {
  
  const myId = mongoose.Types.ObjectId(req.params.id);
  // Looking for a certain match
  match.getModel().findOne({_id:myId}).then((result)=>{
    
    if(result == null)
      return next({ statusCode:404, error: true, errormessage: "The match is not present inside the DB"});
    else{

      // Checking if players are inserted into a DB
      match.getModel().findOne({_id:myId}).select({player1:1,player2:1, ended:1}).then((result)=>{
        const players = [result.player1, result.player2]
        if(result.ended)
          return next({ statusCode:501, error: true, errormessage: "Cannot set winner/loser of a match aready ended"});
        else{
          if(players.includes(req.user.username)){
            // If the control flow pass, set the winner of the match
            match.getModel().updateOne({ _id:myId}, { $set: { winner: null, ended: true} }).then(()=>{
              
              user.getModel().updateOne({username:result.player1}, { $inc: { draw:1 }}).then(()=>{
                user.getModel().updateOne({username:result.player2}, { $inc: { draw:1 }}).then(()=>{
                  return res.status(200).json({message: 'Added draw to ' + result.player1 + ' and ' + result.player2 + ' then setted the match ' + myId + ' drawn.'});
                }).catch((err)=>{
                  return next({ statusCode:500, error: true, errormessage: "Couldn't update " + result.player2 + " stats: " + err});
                })
              }).catch((err)=>{
                return next({ statusCode:500, error: true, errormessage: "Couldn't update " + result.player1 + " stats: " + err});
              })
  
            }).catch((err)=>{
                return next({ statusCode:500, error: true, errormessage: "Error while trying to update match " + req.params.id + " : " + err});
            });
          }else{
            return next({ statusCode:401, error: true, errormessage: "You are not authorized to set the draw"});
          }
        } 
      }).catch((err)=>{
        return next({ statusCode:500, error: true, errormessage: "Error while trying to find match " + req.params.id + " : " + err});
      });    
      
    }
  }).catch((err)=>{
    return next({ statusCode:500, error: true, errormessage: "Error while trying to set match " + req.params.id + " drawn: " + err});
});   
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
          return next({ statusCode:501, error: true, errormessage: "Cannot set winner/loser of a match aready ended"});
        }
        else{
          const players = [result.player1, result.player2]
          
          // getting other player in match
          const opponent = players[players.indexOf(req.user.username) == 1 ? 0 : 1];

          if(!players.includes(req.user.username))
            return next({ statusCode:501, error: true, errormessage: "The user is not equal to one of the two match's players."});
          else{
            // incrementing user losses
            user.getModel().updateOne({username:req.user.username}, { $inc: { loss: 1 }}, null, (err) =>{
              if(err != null)
                return next({statusCode:500, error: true, errormessage: "Error while trying to update " + req.user.username + " losses: " + err});
              else{
                // incrementing user wins
                user.getModel().updateOne({username:opponent}, { $inc: { win: 1 }}, null, (err)=>{
                  // If the control flow pass, set the loser of the match, set the match winner, the match is ended and make the turn null
                  if(err != null)
                    return next({statusCode:500, error: true, errormessage: "Error while trying to update " + opponent + " wins: " + err});
                  else{
                    match.getModel().updateOne({ _id: myId}, {$set: {loser: req.user.username, winner: opponent, ended: true, turn:null}}, null, (err)=>{
                      if(err != null)
                        return next({statusCode:500, error: true, errormessage: "Error while trying to update match " + myId + " stats: " + err});
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
          return next({ statusCode:500, error: true, errormessage: "Error while trying to get match: " + reason});
      });    
      
    }
  })
    
})

// Pusher chat API
app.post("/messages", auth, (req,res,next) => {
  if(req.body.message == null || req.body.id == null || req.body.type == null){
    return next({ statusCode:400, error: true, errormessage: "Body must contain message, id and type fields"});
  }else{

    pusher.trigger("chat" + req.body.id + req.body.type, "message", {
      username: req.user.username,
      message: req.body.message,
      to: req.body.receiver
    });
  
    return res.status(200).json({username:req.user.username, message:req.body.message});
  }
  
})

// Pusher finding match API
app.post("/matchFound", auth, (req,res,next) => {
  if(req.body.matchId == null || req.body.challenged == null)
    return next({ statusCode:400, error: true, errormessage: "Body must contain challenged and matchId fields"});
  else{
    match.getModel().findById(req.body.matchId,(err) => {
      if(err != null)
        return next({statusCode:404, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
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
          return next({statusCode:500, error: true, errormessage: "Canonot find match " + req.body.matchId + " from DB: " + error});
        })
      }
    })
  }
  
})

// Pusher Connect4 API to make a move in the match
app.post("/doMove", auth, (req,res,next) => {
  if(req.body.matchId == null || req.body.columnIndex == null)
    return next({ statusCode:400, error: true, errormessage: "Body must contain matchId and columnIndex fields"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:404, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{
        const allowed_players = [result.player1, result.player2];
        // Checking if player is allowed 
        if(!allowed_players.includes(req.user.username)){
          return next({ statusCode:501, error: true, errormessage: "User " + req.user.username + " is not allowed to play the game"});
        }
        else{
          // Checking if the user is allowed to play at this time
          if(req.user.username != result.turn)
            return next({ statusCode:501, error: true, errormessage: "You're not allowed to do a move at the moment"});
          else{
          
            // We check that to column is correct 
            if(req.body.columnIndex < 0 || req.body.columnIndex > 6)
              return next({ statusCode:501, error: true, errormessage: "columnIndex must be between 0 and 6 to make a move"});
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
                return next({statusCode:500, error: true, errormessage: "Cannot update match " + req.body.matchId + " in DB: " + error});
              })
            }
          }
        }
      }
    })
  }
})

// Pusher Connect4 API to communicate the loss
app.post("/communicateLoss", auth, (req,res,next) => {
  
  if(req.body.matchId == null)
    return next({ statusCode:400, error: true, errormessage: "Body must contain matchId field"});
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
          // We need to set the match ended
          match.getModel().updateOne({id:req.body.matchId}, {$set: {ended: true}}, null, (err) => {
            // Sending event trigger on pusher 
            if(err != null)
              return next({ statusCode:404, error: true, errormessage: "Error while communicating loss: " + err});
            else{
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
          })
        }
      }
    })
  }
})

// Pusher Connect4 API useful to a spectator to request the match state
app.post("/requestState", auth, (req,res,next) => {
  
  if(req.body.matchId == null)
    return next({ statusCode:400, error: true, errormessage: "Body must contain matchId field"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:404, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{

        // Sending event trigger on pusher 
        pusher.trigger(req.body.matchId, "requestState", {
        });
        return res.status(200).json({
          message:"User " + req.user.username + " has requested to spectate the match",
        });
      }
    })
  }
})

// Pusher Connect4 API to send the match state
app.post("/sendState", auth, (req,res,next) => {
  
  if(req.body.matchId == null || req.body.currentBoard == null)
    return next({ statusCode:400, error: true, errormessage: "Body must contain matchId and currentBoard fields"});
  else{
    match.getModel().findById(req.body.matchId, (err, result) => {
      if(err != null)
        return next({statusCode:404, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB."});
      else{
        const allowed_players = [result.player1, result.player2];
        // Checking if player is allowed 
        if(!allowed_players.includes(req.user.username)){
          return next({ statusCode:501, error: true, errormessage: "User " + req.user.username + " is not allowed to send configuration"});
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
    })
  }
})

// Pusher chat API to manage friends requests
app.post("/friendRequests", auth, (req,res,next) => {
  if(req.body.message == null || req.body.id == null || req.body.type == null){
    return next({ statusCode:400, error: true, errormessage: "Body must contain message, id and type fields"});
  }else{

    pusher.trigger("chat" + req.body.id + req.body.type, "friendChannel", {
      username: req.user.username,
      message: req.body.message,
      to: req.body.receiver
    });
    
    return res.status(200).json({username:req.user.username, message:req.body.message});
  }
  
})

// Using HTTP basic authentication strategy with passport middleware.
passport.use( new passportHTTP.BasicStrategy(
  function(usersname,password, done) {
    
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
    let server = http.createServer(app);


    server.listen(8080, () => console.log("HTTPS Server started on port 8443".green));

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