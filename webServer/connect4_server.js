"use strict";
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
    u.firstAccess = true;
    // Set user as a moderator 
    u.setModerator();
    u.setDefault();
    // Saving the new user on the db 'users'
    u.save().then((data) => {
        return res.status(200).json({ error: false, errormessage: "", message: "User successfully added with the id below", id: data._id });
    }).catch((reason) => {
        return next({ statusCode: 500, error: true, errormessage: reason.code + ': ' + reason.errmsg });
    });
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
app.get('/users/:username/profilepic', auth, (req, res) => {
    user.getModel().findOne({ username: req.params.username }, (err, user) => {
        if (err) {
            console.log(err);
            res.status(500).send('An error occurred');
        }
        else {
            res.status(200).json({ "profilepic": user.profilePic });
        }
    });
});
// Main route of users/:username
app.route('/users/:username').get(auth, (req, res, next) => {
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    user.getModel().findOne({ username: req.params.username }).then((user) => {
        if (user == null)
            return next({ statusCode: 404, error: true, errormessage: "The user you are looking for is not present into the DB" });
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
        let friends = friendsList.getFriends();
        // Checking if the user is a moderator or the user himself
        if (!req.user.moderator && (req.params.username != req.user.username) && !friends.includes(req.user.username))
            return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see this user's statistic you must be that user, a moderator or a friend of that user" });
        user.getModel().findOne({ username: req.params.username }).select({ win: 1, loss: 1, draw: 1 }).then((stats) => {
            if (stats == null)
                return res.status(404).json("The user you are looking for is not present into the DB");
            else
                return res.status(200).json(stats);
        }).catch((reason) => {
            return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
        });
    });
});
// Return friends of a certain user
app.get('/users/:username/friends', auth, (req, res, next) => {
    // To find user's friends the user that send the request has to be that user
    if (req.user.username != req.params.username)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see user's friend you have to be that user" });
    user.getModel().findOne({ username: req.params.username }).select({ friends: 1 }).then((friends) => {
        if (friends == null)
            return res.status(200).json("The user you are looking for is not present into the DB");
        else
            return res.status(200).json(friends);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
});
// Return friends' request of a certain user
app.get('/users/:username/friendsRequests', auth, (req, res, next) => {
    // To find user's friends the user that send the request has to be that user
    if (req.user.username != req.params.username)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: to see user's friend requests you have to be that user" });
    user.getModel().findOne({ username: req.params.username }).select({ pendingRequests: 1 }).then((requests) => {
        return res.status(200).json(requests);
    }).catch((reason) => {
        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
    });
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
    if (!req.user.moderator)
        return next({ statusCode: 404, error: true, errormessage: "Unauthorized: user is not a moderator" });
    // We insert a new match from the data included in the body
    // after checking if all the required fields are present
    if (req.body.player1 == null || req.body.player2 == null || req.body.spectators == null || req.body.winner == null)
        return next({ statusCode: 404, error: true, errormessage: "Check fields in body request. Fields that must be inserted are: player1, player2, spectators, winner" });
    // Checking for fields correction 
    if ((req.body.winner != "" && req.body.winner != req.body.player1) || (req.body.winner != "" && req.body.winner != req.body.player1))
        return next({ statusCode: 404, error: true, errormessage: "The winner's name must be the same of the one of the two players" });
    // Checking if players are inserted into a DB
    user.getModel().findOne({ username: req.body.player1 }).then((result) => {
        if (result == null)
            return next({ statusCode: 404, error: true, errormessage: "The user you are trying to insert is not present into the db." });
        else {
            user.getModel().findOne({ username: req.body.player2 }).then((result) => {
                if (result == null)
                    return next({ statusCode: 404, error: true, errormessage: "The user you are trying to insert is not present into the db." });
                else {
                    // The users are checked, now we can correctly insert the match
                    var endedValue;
                    if (req.body.winner != undefined)
                        endedValue = true;
                    else
                        endedValue = false;
                    match.getModel().create({
                        player1: req.body.player1,
                        player2: req.body.player2,
                        spectators: req.body.spectators,
                        winner: req.body.winner,
                        ended: endedValue
                    }).then(() => {
                        return res.status(200).json('New match correctly added');
                    }).catch((reason) => {
                        return next({ statusCode: 404, error: true, errormessage: "DB error: " + reason });
                    });
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
                                user.getModel().updateOne({ username: req.params.username }, { $set: { updated_wins_number } }).then(() => {
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
                                user.getModel().updateOne({ username: req.params.username }, { $set: { updated_loss_number } }).then(() => {
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
    pusher.trigger("chat", "message", {
        username: req.body.username,
        message: req.body.message
    });
    res.json([]);
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
    // If we reach this point, the user is successfully authenticated and
    // has been injected into req.user
    // We now generate a JWT with the useful user data
    // and return it as response
    const tokendata = {
        id: req.user.id,
        username: req.user.username,
        moderator: req.user.moderator,
        firstAccess: req.user.firstAccess,
    };
    console.log("Login granted. Token has been generated");
    var token_signed = jsonwebtoken.sign(tokendata, process.env.JWT_SECRET, { expiresIn: '24h' });
    // Note: You can manually check the JWT content at https://jwt.io
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
mongoose.connect('mongodb://localhost:27017/connect4', { useNewUrlParser: true, useUnifiedTopology: true })
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