"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const result = require('dotenv').config();
if (result.error) {
    console.log("Unable to load \".env\" file. Please provide one to store the JWT secret key");
    process.exit(-1);
}
if (!process.env.JWT_SECRET) {
    console.log("\".env\" file loaded but JWT_SECRET=<secret> key-value pair was not found");
    process.exit(-1);
}
const fs = require("fs"); // File System module
const http = require("http"); // HTTP module
const https = require("https"); // HTTPS module
const colors = require("colors"); // Colors module for debugging 
colors.enabled = true;
const mongoose = require("mongoose");
const match = require("./matches");
const user = require("./users");
const express = require("express");
// directly provide a JavaScript object if the "Content-type" is
// application/json
const passport = require("passport"); // authentication middleware for Express
const passportHTTP = require("passport-http"); // implements Basic and Digest authentication for HTTP (used for /login endpoint)
const jsonwebtoken = require("jsonwebtoken"); // JWT generation
const jwt = require("express-jwt"); // JWT parsing middleware for express
const cors = require("cors"); // Enable CORS middleware
const io = require("socket.io"); // Socket.io websocket library
const app = express();
const auth = jwt({ secret: process.env.JWT_SECRET });
const bodyParser = require('body-parser');
// cors make possibile to send request from a website to another website on the broswer by adding a section on the header
app.use(cors());
// Setting payload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
// Setting up Pusher 
const Pusher = require("pusher");
const pusher = new Pusher({
    appId: "1242312",
    key: "2eb653c8780c9ebbe91e",
    secret: "cedef58c4729c1d12c7c",
    cluster: "eu",
    useTLS: true
});
// Setting up Mutler for storing uploaded files
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });
app.use((req, res, next) => {
    console.log("------------------------------------------------".inverse);
    console.log("New request for: " + req.url);
    console.log("Method: " + req.method);
    next();
});
// Adding API routes to express application
// App's root: return to the client every possible endpoints of our app
app.get("/", (req, res) => {
    res.status(200).json({
        api_version: "0.0.1",
        endpoints: ["/users", "/matches", "/messages", "/login"]
    });
});
// Main route of users
app.get('/users', auth, (req, res, next) => {
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    user.getModel().find({}).then((users) => {
        return res.status(200).json(users);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
app.post('/users/addModerator', auth, (req, res, next) => {
    // Adding a new moderator
    // Checking if the user who sent the request is a moderator
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    if (req.body.username == null || req.body.password == null) {
        return next({ statusCode: 404, error: true,
            errormessage: "Check fields in body request.\n Fields that must be inserted are: username and password" });
    }
    var u = user.newUser(req.body);
    // Inserting a new user inside the system with a temporaray password
    u.setPassword(req.body.password);
    // Set user as a moderator 
    u.setModerator();
    u.setDefault();
    // Saving the new user on the db 'users'
    u.save().then((data) => {
        return res.status(200).json({ error: false, errormessage: "", message: "Moderator successfully added with the id below", id: data._id });
    }).catch((reason) => {
        // Handle even the case if the user is a duplicate
        return next({ statusCode: 500, error: true, errormessage: reason.code + ': ' + reason.errmsg });
    });
});
// TODO: sistemare il problema closure
// Endpoint to search user's friend
app.get('/users/searchForUsers', auth, (req, res, next) => {
    var users = [];
    if (req.user != null) {
        user.getModel().find({}).then((userList) => {
            userList.forEach(user => {
                users.push({ "username": user.username, "picProfile": user.profilePic });
            });
            users.filter((user, index) => {
                if (user == req.user.username) {
                    // It delete the element in index pos
                    users.splice(index, 1);
                }
            });
            // Looking for friend of that user
            user.getModel().find({ id: req.user.id }).select({ friends: 1 }).then((friendsList) => {
                users.filter((user, index) => {
                    friendsList.forEach((friend) => {
                        if (user == friend.username)
                            users.splice(index, 1);
                    });
                });
                return res.status(200).json({ users: users });
            }).catch((error) => {
                return next({ statusCode: error.code, error: true, errormessage: "Couldn't find user's friends" });
            });
        });
    }
    else
        return next({ statusCode: 500, error: true, errormessage: "User is not defined" });
});
app.post('/users/addUser', (req, res, next) => {
    // Adding a new user
    if (req.body.username == null || req.body.password == null || req.body.name == null || req.body.surname == null || req.body.moderator == null || req.body.profilePic == null || req.body.firstAccess == null) {
        return next({ statusCode: 404, error: true,
            errormessage: "Check fields in body request.\n Fields that must be inserted are: username, password, name, surname, moderator, profilePic, firstAccess" });
    }
    var u = user.newUser(req.body);
    // Inserting a new user inside the system with a temporaray password
    u.setPassword(req.body.password);
    u.name = req.body.name;
    u.surname = req.body.surname;
    // Setting of moderator, this endpoint is used to register moderators and normal users
    u.moderator = req.body.moderator;
    // Setting of firstAccess
    u.firstAccess = req.body.firstAccess;
    u.setDefault();
    // Uploading user's profile pic as Base64 image
    u.profilePic = req.body.profilePic;
    // Saving the new user on the db 'users'
    u.save().then((data) => {
        return res.status(200).json({ error: false, errormessage: "", message: "User successfully added with the id below", id: data._id });
    }).catch((reason) => {
        return next({ statusCode: 500, error: true, errormessage: reason.code + ': ' + reason.errmsg });
    });
});
// Reset credentials of new moderator
app.post('/users/setModerator/:username', auth, (req, res, next) => {
    // We reset the password too because the first one was given as a temporary password
    if (req.body.password == null || req.body.name == null || req.body.surname == null || req.body.profilePic == null) {
        return next({ statusCode: 404, error: true,
            errormessage: "Check fields in body request.\n Fields that must be inserted are: name, password, surname and profilePic" });
    }
    //getting the use with the username and update the corrispondent fields
    user.getModel().updateOne({ username: req.params.username }, { $set: { password: req.body.password, name: req.body.name, surname: req.body.surname, profilePic: req.body.profilePic } }).then(() => {
        return res.status(200).json({ error: false, errormessage: "", message: "User " + req.params.username + " correctly updated" });
    }).catch((reason) => {
        return next({ statusCode: 400, error: true, errormessage: reason.code + ': ' + reason.errmsg });
    });
});
app.get('/users/:username/profilepic', auth, (req, res, next) => {
    user.getModel().findOne({ username: req.params.username }).then((user) => {
        if (user == null)
            return next({ statusCode: 404, error: true, errormessage: "User " + req.params.username + " not found in DB." });
        else
            return res.status(200).json({ "profilepic": user.profilePic });
    }).catch((error) => {
        return next({ statusCode: error.code, error: true, errormessage: "Couldn't get user from DB. " + error.code });
    });
});
// Change firstaccess field when a user is logged in for the first time
app.get('/users/:username/firstLogin', auth, (req, res, next) => {
    // Checking if the given username exists
    user.getModel().findOne({ username: req.params.username }).then((username) => {
        if (username == null)
            return next({ statusCode: 404, error: true, errormessage: "The user with username " + username.username + " is not present into the DB" });
        else {
            user.getModel().updateOne({ _id: username._id }, { $set: { firstAccess: false } }).then(() => {
                // Setting a new jwt on new login
                const tokendata = {
                    id: username._id,
                    username: username.username,
                    moderator: username.moderator,
                    firstAccess: false,
                };
                console.log("Login granted. New token has been generated");
                const token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });
                return res.status(200).json({ error: false, errormessage: "", message: username.username + " firstaccess correctly updated", token: token_signed });
            }).catch(() => {
                return next({ statusCode: 404, error: true, errormessage: "Couldn't update " + username.username + "firstaccess" });
            });
        }
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Return all users with stats
app.get('/users/allUserWithStats', auth, (req, res, next) => {
    // To find user's friends the user that send the request has to be that user
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    else {
        var users_with_stats = [];
        user.getModel().find({}).then(myusers => {
            var findAndPushUser = function (user_with_stats, myuser) {
                return __awaiter(this, void 0, void 0, function* () {
                    user.getModel().findOne({ username: myuser.username }).select({ win: 1, loss: 1, draw: 1 }).then((stats) => {
                        user_with_stats.push({
                            "username": myuser.username,
                            "stats": {
                                "win": Number(stats.win),
                                "loss": Number(stats.loss),
                                "draw": Number(stats.draw),
                            }
                        });
                    }).catch((error) => {
                        return next({ statusCode: error.code, error: true, errormessage: "Error while trying to get user's stats of user " + req.params.username });
                    });
                });
            };
            myusers.forEach((myuser) => __awaiter(void 0, void 0, void 0, function* () {
                yield findAndPushUser(users_with_stats, myuser);
            }));
            return res.status(200).json({ result: users_with_stats });
        }).catch((reason) => {
            return next({ statusCode: 404, error: true, errormessage: "Error while trying to get user " + req.params.username + ". " + reason });
        });
    }
});
// Return if the user is looking for a match
app.get('/users/getLookingForAMatch', auth, (req, res, next) => {
    // Checking if the user is a moderator or the user himself or one of his friends
    if (req.user != null) {
        user.getModel().findOne({ username: req.user.username }).select({}).then((response) => {
            return res.status(200).json({ lookingForAMatch: response.isLookingForAMatch });
        }).catch((error) => {
            return next({ statusCode: error.code, error: true, errormessage: "Cannot retrieve user " + req.user.username + " from DB." });
        });
    }
    else {
        return next({ statusCode: 404, error: true, errormessage: "Cannot access this endpoint" });
    }
});
app.get('/users/pairUserForAMatch', auth, (req, res, next) => {
    // Search a user to match with if possible 
    if (req.user != null) {
        user.getModel().find().select({}).where('isLookingForAMatch').equals(true).where('username').ne(req.user.username).then((response) => {
            if (response.length != 0) {
                const waitingUsers = response;
                const index = Math.floor(Math.random() * waitingUsers.length);
                return res.status(200).json({ user: response[index] });
            }
            else {
                return res.status(200).json({ user: null });
            }
        }).catch((error) => {
            return next({ statusCode: error.code, error: true, errormessage: "Cannot get isLookingForAMatch from users from DB" });
        });
    }
    else {
        return next({ statusCode: 404, error: true, errormessage: "Cannot access this endpoint" });
    }
});
// Main route of users/:username
app.route('/users/:username').get(auth, (req, res, next) => {
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    user.getModel().findOne({ username: req.params.username }).then((user) => {
        if (user == null)
            return next({ statusCode: 500, error: true, errormessage: "The user you are looking for is not present into the DB" });
        else
            return res.status(200).json(user);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
}).delete(auth, (req, res, next) => {
    // I can remove a user only if I am a moderator
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    user.getModel().findOne({ username: req.params.username }).then((result) => {
        // Checking if the document exists
        if (result == null)
            return next({ statusCode: 404, error: true, errormessage: "The user you are looking for is not present into the DB" });
        else {
            user.getModel().deleteOne({ username: req.params.username }).then(() => {
                return res.status(200).json('User ' + req.params.username + ' successfully deleted from the DB');
            }).catch((reason) => {
                return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
            });
        }
    });
});
// Return the stats of a certain user
app.get('/users/:username/stats', auth, (req, res, next) => {
    user.getModel().findOne({ username: req.params.username }).select({ friends: 1 }).then((friendsList) => {
        // Checking if the user is a moderator or the user himself or one of his friends
        if (!req.user.moderator && (req.params.username != req.user.username) && !((friendsList.friends).includes(req.user.username)))
            return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see this user's statistic you must be that user, a moderator or a friend of that user" });
        user.getModel().findOne({ username: req.params.username }).select({ win: 1, loss: 1, draw: 1 }).then((stats) => {
            if (stats == null)
                return next({ statusCode: 404, error: true, errormessage: "Couldn't load stats of user " + req.params.username });
            else
                return res.status(200).json({ stats: stats });
        }).catch((reason) => {
            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
        });
    }).catch((error) => {
        return next({ statusCode: error.code, error: true, errormessage: error });
    });
});
// Set if user is looking for a match
app.get('/users/setLookingForAMatch/:value', auth, (req, res, next) => {
    // Checking if the user is a moderator or the user himself or one of his friends
    if (req.user != null) {
        user.getModel().findOne({ username: req.user.username }).select({}).then((response) => {
            if (response == null)
                return next({ statusCode: 404, error: true, errormessage: "The user you are looking for is not present into the DB" });
            else {
                const valueToUpdate = (req.params.value == "true");
                user.getModel().updateOne({ username: req.user.username }, { $set: { isLookingForAMatch: valueToUpdate } }).then(() => {
                    return res.status(200).json({ message: "User state of looking for a match setted: " + req.params.value });
                }).catch((error) => {
                    return next({ statusCode: error.code, error: true, errormessage: "Cannot update isLookingForAMatch: " + error });
                });
            }
        }).catch((error) => {
            return next({ statusCode: error.code, error: true, errormessage: "Cannot retrieve isLookingForAMatch for user " + req.user.username });
        });
    }
    else {
        return next({ statusCode: 404, error: true, errormessage: "Cannot access this endpoint" });
    }
});
// TODO: DA SISTEMARE
// Return friends of a certain user
app.get('/users/:username/friendsWithStats', auth, (req, res, next) => {
    // To find user's friends the user that send the request has to be that user
    if (req.user.username != req.params.username)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user" });
    user.getModel().findOne({ username: req.params.username }).select({ friends: 1 }).then((myuser) => {
        if (myuser == null)
            return res.status(200).json("The user you are looking for is not present into the DB");
        else {
            let friends_with_stats = [];
            function createArray(friends_with_stats) {
                (myuser.friends).forEach(friend => {
                    user.getModel().findOne({ username: friend }).select({ win: 1, loss: 1, draw: 1 }).then((stats) => {
                        friends_with_stats.push({
                            "username": friend,
                            "stats": {
                                "win": Number(stats.win),
                                "loss": Number(stats.loss),
                                "draw": Number(stats.draw),
                            }
                        });
                    });
                });
            }
            createArray(friends_with_stats);
            console.log(friends_with_stats);
            return res.status(200).json({ result: 'ciao' });
        }
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "Error while trying to get user " + req.params.username + ". " + reason });
    });
});
// Return friends of a certain user
app.get('/users/:username/friends', auth, (req, res, next) => {
    // To find user's friends the user that send the request has to be that user
    if (req.user.username != req.params.username)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user" });
    user.getModel().findOne({ username: req.params.username }).select({ friends: 1 }).then((user) => {
        if (user == null)
            return res.status(200).json("The user you are looking for is not present into the DB");
        else
            return res.status(200).json(user.friends);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Return friends' request of a certain user
app.get('/users/:username/friendsRequests', auth, (req, res, next) => {
    // To find user's friends the user that send the request has to be that user
    if (req.user.username != req.params.username)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see user's friend requests you have to be that user" });
    if (req.user != null)
        user.getModel().findOne({ username: req.user.username }).select({ pendingRequests: 1 }).then((userList) => {
            return res.status(200).json({ friendsRequests: userList.pendingRequests });
        });
    else
        return next({ statusCode: 404, error: true, errormessage: "Couldn't get user from request" });
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
app.get('/users/sendFriendship/:username', auth, (req, res, next) => {
    if (req.user != null) {
        // Checking if username to add exists
        user.getModel().findOne({ username: req.params.username }).then(() => {
            user.getModel().findOne({ username: req.params.username }).select({ pendingRequests: 1 }).then((result) => {
                if ((result.pendingRequests).includes(req.params.user))
                    return next({ statusCode: 404, error: true, errormessage: "Friendship request to user " + req.params.username + " has been already sent" });
                else {
                    user.getModel().updateOne({ username: req.params.username }, { $push: { pendingRequests: req.user.username } }).then(() => {
                        return res.status(200).json({ message: "Friend request sent to " + req.params.username });
                    }).catch((error) => {
                        return next({ statusCode: error.code, error: true, errormessage: "Couldn't send friend request to user " + req.params.username });
                    });
                }
            }).catch((error) => {
                return next({ statusCode: 404, error: true, errormessage: "Couldn't get user from DB. " + error.code });
            });
        });
    }
    else
        return next({ statusCode: 404, error: true, errormessage: "Couldn't get user from request" });
});
// Accept friend request of a certain user
app.get('/users/acceptFriendship/:friend', auth, (req, res, next) => {
    // We check that the friend is inside user's friendRequest list
    if (req.user != null) {
        user.getModel().findOne({ username: req.params.friend }).then((friendUser) => {
            user.getModel().findOne({ username: req.user.username }).select({ pendingRequests: 1 }).then((friendRequestsList) => {
                // We update the friend list of the user 
                if ((friendRequestsList.pendingRequests).includes(friendUser.username)) {
                    user.getModel().findByIdAndUpdate(req.user.id, { $push: { friends: friendUser.username } }).then(() => {
                        user.getModel().findByIdAndUpdate(req.user.id, { $pull: { pendingRequests: friendUser.username } }).then(() => {
                            return res.status(200).json({ message: "User " + req.user.username + " added friend " + friendUser.username + " correctly" });
                        }).catch(() => {
                            return next({ statusCode: 404, error: true, errormessage: "Couldn't delete " + req.params.friend + " from pending requests" });
                        });
                    }).catch(() => {
                        return next({ statusCode: 404, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username });
                    });
                }
                else
                    return next({ statusCode: 404, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username });
            }).catch(() => {
                return next({ statusCode: 404, error: true, errormessage: "Error while trying to retrieve " + req.params.friend + " in pending requests" });
            });
        }).catch(() => {
            return next({ statusCode: 404, error: true, errormessage: "Couldn't retrive " + req.params.friend + " from DB" });
        });
    }
    else
        return next({ statusCode: 404, error: true, errormessage: "Couldn't get user from request" });
});
// Accept friend request of a certain user
app.get('/users/rejectFriendship/:friend', auth, (req, res, next) => {
    // We check that the friend is inside user's friendRequest list
    if (req.user != null) {
        user.getModel().findOne({ username: req.params.friend }).then((friendUser) => {
            user.getModel().findOne({ username: req.user.username }).select({ pendingRequests: 1 }).then((friendRequestsList) => {
                // We update the friend list of the user 
                if ((friendRequestsList.pendingRequests).includes(friendUser.username)) {
                    user.getModel().findByIdAndUpdate(req.user.id, { $pull: { pendingRequests: friendUser.username } }).then(() => {
                        return res.status(200).json({ message: "User " + req.user.username + " added friend " + friendUser.username + " correctly" });
                    }).catch(() => {
                        return next({ statusCode: 404, error: true, errormessage: "Couldn't delete " + req.params.friend + " from pending requests" });
                    });
                }
                else
                    return next({ statusCode: 404, error: true, errormessage: 'User ' + friendUser.username + ' is not inside pendingFriendsRequest of user ' + req.user.username });
            }).catch(() => {
                return next({ statusCode: 404, error: true, errormessage: "Error while trying to retrieve " + req.params.friend + " in pending requests" });
            });
        }).catch(() => {
            return next({ statusCode: 404, error: true, errormessage: "Couldn't retrive " + req.params.friend + " from DB" });
        });
    }
    else
        return next({ statusCode: 404, error: true, errormessage: "Couldn't get user from request" });
});
// Main route of matches
app.route("/matches").get(auth, (req, res, next) => {
    // We find all the matches and we output them in JSON format
    match.getModel().find({}).then((matches) => {
        return res.status(200).json(matches);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
}).post(auth, (req, res, next) => {
    // We insert a new match from the data included in the body
    // after checking if all the required fields are present
    if (req.body.player1 == null || req.body.player2 == null)
        return next({ statusCode: 404, error: true, errormessage: "Check fields in body request. Fields that must be inserted are: player1, player2" });
    // Checking if players are inserted into a DB
    user.getModel().findOne({ username: req.body.player1 }).then((result) => {
        if (result == null)
            return next({ statusCode: 404, error: true, errormessage: "The user you are trying to insert is not present into the db." });
        else {
            user.getModel().findOne({ username: req.body.player2 }).then((result) => {
                if (result == null)
                    return next({ statusCode: 404, error: true, errormessage: "The user you are trying to insert is not present into the db." });
                else {
                    // Checking spectators field
                    if (req.body.spectators != null) {
                        if (req.body.spectators[0].length == req.body.spectators[1].length) {
                            (req.body.spectators[0]).forEach(element => {
                                if (typeof element != "string") {
                                    return next({ statusCode: 404, error: true, errormessage: "Spectators field not correctly formatted: must be [string[], boolean[]]" });
                                }
                                else
                                    user.getModel().findOne({ username: element }).then((result) => {
                                        if (result == null)
                                            return next({ statusCode: 404, error: true, errormessage: "Spectators field must contain an existent user" });
                                    });
                            });
                            (req.body.spectators[1]).forEach(element => {
                                if (typeof element != "boolean")
                                    return next({ statusCode: 404, error: true, errormessage: "Spectators field not correctly formatted: must be [string[], boolean[]]" });
                            });
                        }
                    }
                    // The users are checked, now we can correctly insert the match
                    const players = [req.body.player1, req.body.player2];
                    if (req.body.winner != null) {
                        if (players.includes(req.body.winner)) {
                            match.getModel().create({
                                player1: req.body.player1,
                                player2: req.body.player2,
                                spectators: req.body.spectators,
                                winner: req.body.winner,
                                ended: true
                            }).then((matchCreated) => {
                                return res.status(200).json({ message: 'New ended match correctly added', id: matchCreated._id });
                            }).catch((reason) => {
                                return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                            });
                        }
                        else {
                            return next({ statusCode: 404, error: true, errormessage: "winner field must be one of the two players" });
                        }
                    }
                    else {
                        match.getModel().create({
                            player1: req.body.player1,
                            player2: req.body.player2,
                            spectators: [],
                            winner: undefined,
                            ended: false
                        }).then((matchCreated) => {
                            return res.status(200).json({ message: 'New match correctly added', id: matchCreated._id });
                        }).catch((reason) => {
                            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                        });
                    }
                }
            }).catch((reason) => {
                return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
            });
        }
    });
});
// Main rout of matches/:id
app.route("/matches/:id").delete(auth, (req, res, next) => {
    if ((req.params.id).length != 24)
        return next({ statusCode: 404, error: true, errormessage: "The match id must be 24 character length" });
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).then((result) => {
        // Checking if the document exists
        if (result == null)
            return next({ statusCode: 404, error: true, errormessage: "The match you are looking for is not present into the DB" });
    }).then(() => {
        // Deleting the existing document 
        match.getModel().deleteOne({ _id: myId }).then(() => {
            return res.status(200).json('The match with the curret id (' + myId + ') has been deleted');
        }).catch((reason) => {
            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
        });
    });
}).get(auth, (req, res, next) => {
    if ((req.params.id).length != 24)
        return next({ statusCode: 404, error: true, errormessage: "The match id must be 24 character length" });
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).then((result) => {
        // Checking if the document exists
        if (result == null)
            return next({ statusCode: 404, error: true, errormessage: "The match you are looking for is not present into the DB" });
        return res.status(200).json(result);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Return which players played/ are playing the match
app.get("/matches/:id/players", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ player1: 1, player2: 1 }).then((players) => {
        res.status(200).json(players);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Return which players are watching the match
app.get("/matches/:id/observers", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ spectators: 1 }).then((observers) => {
        // Checking if the match exists
        if (observers == null)
            return next({ statusCode: 404, error: true, errormessage: "The match you are looking for is not present into the DB" });
        // Extracting only the users that are currently wacthing the match
        const ourObservers = [];
        for (var i = 0; i < observers.spectators[1].length; i++) {
            if (observers.spectators[1][i])
                // If the spectator is currently watching the match is added to indexes
                ourObservers.push(observers.spectators[0][i]);
        }
        return res.status(200).json({ "observers": ourObservers });
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Add a spectator to a certain match
app.post("/matches/:id/addSpectator/:username", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ spectators: 1 }).then((observers) => {
        // Checking if the match exists
        if (observers == null)
            return next({ statusCode: 404, error: true, errormessage: "The match you are looking for is not present into the DB" });
        // If the request doesn't have the username field
        if (req.params.username == null)
            return next({ statusCode: 404, error: true, errormessage: "You need to specify the user in the request with 'username'" });
        user.getModel().findOne({ username: req.body.username }).then((result) => {
            // If username is not present inside the DB
            if (result == null)
                return next({ statusCode: 404, error: true, errormessage: "The user you've tried to add is not a DB's user" });
            else {
                // Spectators' array modified with the added spectator
                var newArray = observers.spectators;
                newArray[0].push(req.params.username);
                newArray[1].push(true);
                // Adding spectators to the match 
                match.getModel().updateOne({ _id: myId }, { $set: { spectators: newArray } }).then(() => {
                    return res.status(200).json('Spectator ' + req.params.username + ' has been successfully added.');
                }).catch((reason) => {
                    return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                });
            }
        });
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Add spectators to a certain match
app.post("/matches/:id/addSpectators", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ spectators: 1 }).then((observers) => {
        // Checking if the match exists
        if (observers == null)
            return next({ statusCode: 404, error: true, errormessage: "The match you are looking for is not present into the DB" });
        else {
            // Checking if the users are present into the DB
            for (let spect in req.body.usernames) {
                user.getModel().findOne({ username: spect }).then((result) => {
                    if (result == null)
                        return next({ statusCode: 404, error: true, errormessage: "The user " + req.body.usernames[spect] + " is not present into the DB" });
                    else {
                        // Adding the relative spectator to the match
                        observers.spectators[0].push(spect);
                        observers.spectators[1].push(true);
                        // Spectators' array modified with the added spectator
                        var newArray = observers.spectators;
                        // Adding spectators to the match 
                        match.getModel().updateOne({ _id: myId }, { $set: { spectators: newArray } }).then(() => {
                            return res.status(200).json('Spectators ' + req.body.usernames + ' have been successfully added.');
                        }).catch((reason) => {
                            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                        });
                    }
                });
            }
        }
    });
});
// Return which players have seen the match
app.get("/matches/:id/spectators", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ spectators: 1 }).then((spectators) => {
        return res.status(200).json(spectators);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Set that a spectator is not watching a match anymore
app.delete("/matches/:id/:username", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ spectators: 1 }).then((observers) => {
        // Checking if the match exists
        if (observers == null)
            return next({ statusCode: 404, error: true, errormessage: "The match you are looking for is not present into the DB" });
        user.getModel().findOne({ username: req.body.username }).then((result) => {
            // If username is not present inside the DB
            if (result == null)
                return next({ statusCode: 404, error: true, errormessage: "The user you've tried to delete is not a DB's user" });
            else {
                // Spectators' array modified with the added spectator
                var newArray = observers.spectators;
                newArray[1][newArray[0].indexOf(req.params.username)] = false;
                // Adding spectators to the match 
                match.getModel().updateOne({ _id: myId }, { $set: { spectators: newArray } }).then(() => {
                    return res.status(200).json('Spectator ' + req.params.username + ' is not watching the match anymore');
                }).catch((reason) => {
                    return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                });
            }
        });
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Set the winner of the match
app.get("/matches/:id/setWinner/:username", auth, (req, res, next) => {
    // Checking if the user that send the request is the admin user: just the admin user can register matches' winners.
    if (req.user.username != 'admin') {
        return next({ statusCode: 404, error: true, errormessage: "You are not authorized to set a winner/loser." });
    }
    else {
        const myId = mongoose.Types.ObjectId(req.params.id);
        // Looking for a certain match
        match.getModel().findOne({ _id: myId }).then((result) => {
            if (result == null)
                return next({ statusCode: 404, error: true, errormessage: "The match is not present inside the DB" });
            else {
                // Checking if players are inserted into a DB
                match.getModel().findOne({ _id: myId }).select({ player1: 1, playe2: 1 }).then((result) => {
                    const players = [String(result.player1), String(result.player2)];
                    if (players.includes(String(req.params.username)) == false)
                        return res.status(200).json("The user you are trying to insert is not present into the db or is not equal to one of the two match's players.");
                    else {
                        // If the control flow pass, set the winner of the match
                        match.getModel().updateOne({ _id: myId }, { $set: { winner: req.params.username } }).then(() => {
                            user.getModel().findOne({ username: req.params.username }).select({ win: 1 }).then((result) => {
                                var updated_wins_number = result.win + 1;
                                user.getModel().updateOne({ username: req.params.username }, { $set: { win: updated_wins_number } }).then(() => {
                                    return res.status(200).json('Winner ' + req.params.username + ' of match ' + req.params.id + ' setted correcty.');
                                });
                            });
                        }).catch((reason) => {
                            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                        });
                    }
                }).catch((reason) => {
                    return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                });
            }
        });
    }
});
// Return the winner of a match
app.get("/matches/:id/winner", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ winner: 1 }).then((result) => {
        return res.status(200).json({ "winner": result.winner });
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// TODO: implementare
// Set the match drawn
//app.get("/matches/:id/draw", auth, (req,res,next) => {
// Set the loser of the match
app.get("/matches/:id/setLoser/:username", auth, (req, res, next) => {
    // Checking if the user that send the request is the admin user: just the admin user can register matches' winners.
    if (req.user.username != 'admin') {
        return next({ statusCode: 404, error: true, errormessage: "You are not authorized to set a winner/loser." });
    }
    else {
        const myId = mongoose.Types.ObjectId(req.params.id);
        // Looking for a certain match
        match.getModel().findOne({ _id: myId }).then((result) => {
            if (result == null)
                return next({ statusCode: 404, error: true, errormessage: "The match is not present inside the DB" });
            else {
                // Checking if players are inserted into a DB
                match.getModel().findOne({ _id: myId }).select({ player1: 1, playe2: 1 }).then((result) => {
                    const players = [String(result.player1), String(result.player2)];
                    if (players.includes(String(req.params.username)) == false)
                        return res.status(200).json("The user you are trying to insert is not present into the db or is not equal to one of the two match's players.");
                    else {
                        // If the control flow pass, set the loser of the match
                        match.getModel().updateOne({ _id: myId }, { $set: { loser: req.params.username } }).then(() => {
                            user.getModel().findOne({ username: req.params.username }).select({ loss: 1 }).then((result) => {
                                var updated_loss_number = result.loss + 1;
                                user.getModel().updateOne({ username: req.params.username }, { $set: { loss: updated_loss_number } }).then(() => {
                                    return res.status(200).json('Loser ' + req.params.username + ' of match ' + req.params.id + ' setted correcty.');
                                });
                            });
                        }).catch((reason) => {
                            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                        });
                    }
                }).catch((reason) => {
                    return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                });
            }
        });
    }
});
// We want to know the loser of a match
app.get("/matches/:id/loser", auth, (req, res, next) => {
    const myId = mongoose.Types.ObjectId(req.params.id);
    match.getModel().findOne({ _id: myId }).select({ loser: 1 }).then((loser) => {
        return res.status(200).json({ "loser ": loser });
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Pusher chat API
app.post("/messages", auth, (req, res, next) => {
    if (req.body.message == null || req.body.type == null) {
        return next({ statusCode: 404, error: true, errormessage: "Body must contain message and type fields" });
    }
    else {
        pusher.trigger("chat" + req.body.type, "message", {
            username: req.user.username,
            message: req.body.message
        });
        return res.status(200).json({ username: req.user.username, message: req.body.message });
    }
});
// Pusher finding match API
app.post("/matchFound", auth, (req, res, next) => {
    if (req.body.matchId == null || req.body.username == null)
        return next({ statusCode: 404, error: true, errormessage: "Body must contain username and matchId fields" });
    else {
        match.getModel().findById(req.body.matchId, (err) => {
            if (err != null)
                return next({ statusCode: err.code, error: true, errormessage: "Match with Id " + req.body.matchId + " not found inside DB." });
            else {
                user.getModel().findOne({ username: req.body.username }).then((response) => {
                    if (response == null) {
                        return next({ statusCode: 404, error: true, errormessage: "Username " + req.body.username + " has not found into the DB." });
                    }
                    else {
                        pusher.trigger("lookingForAMatch", "matchFound", {
                            username: req.body.username,
                            challenged: req.body.challenged,
                            matchId: req.body.matchId
                        });
                        return res.status(200).json({ message: "match found", username: req.body.username, against: req.body.challenged });
                    }
                });
            }
        });
    }
});
// Using HTTP basic authentication strategy with passport middleware.
passport.use(new passportHTTP.BasicStrategy(function (usersname, password, done) {
    // "done" callback (verify callback) documentation:  http://www.passportjs.org/docs/configure/
    // Delegate function we provide to passport middleware
    // to verify user credentials 
    console.log("New login attempt from ".green + usersname);
    user.getModel().findOne({ username: usersname }, (err, user) => {
        if (err) {
            return done({ statusCode: 500, error: true, errormessage: err });
        }
        if (!user) {
            return done(null, false, { statusCode: 500, error: true, errormessage: "User not exists" });
        }
        if (user.validatePassword(password)) {
            return done(null, user);
        }
        return done(null, false, { statusCode: 500, error: true, errormessage: "Password is not correct" });
    });
}));
// Login endpoint uses passport middleware to check
// user credentials before generating a new JWT
app.get("/login", passport.authenticate('basic', { session: false }), (req, res, next) => {
    const tokendata = {
        id: req.user.id,
        username: req.user.username,
        moderator: req.user.moderator,
        firstAccess: req.user.firstAccess,
    };
    console.log("Login granted. Token has been generated");
    const token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });
    return res.status(200).json({ error: false, errormessage: "", token: token_signed });
});
// Add error handling middleware
app.use((err, req, res, next) => {
    console.log("Request error: ".red + JSON.stringify(err));
    res.status(err.statusCode || 500).json(err);
});
// The very last middleware will report an error 404 
// (will be eventually reached if no error occurred and if
//  the requested endpoint is not matched by any route)
//
app.use((req, res, next) => {
    res.status(404).json({ statusCode: 404, error: true, errormessage: "Invalid endpoint" });
});
// Connect to mongodb and launch the HTTP server trough Express
// by using async promises
mongoose.connect('mongodb://localhost:27017/connect4', { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false })
    .then(() => {
    console.log("Connected to MongoDB");
    return user.getModel().findOne({});
}).then((doc) => {
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
        u.save();
    }
    else {
        console.log("Admin user already exists");
    }
}).then(() => {
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
}).catch((err) => {
    console.log("Error Occurred during initialization".red);
    console.log(err);
});
//# sourceMappingURL=connect4_server.js.map