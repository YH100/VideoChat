// -------------------- Requires --------------------
var express = require('express');
var browserify = require('browserify-middleware');
var session = require('express-session');
var app = express();
var bodyParser = require('body-parser');
var sqlite3Sync = getSyncSqlite3();
const sqlite3 = require('sqlite3').verbose();
var flash = require('connect-flash-plus');
var redis = require("redis");
const util = require('util')

// -------------------- app.use --------------------
// app.use(express.static('public'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/xwww-
//app.use(session(
//    {"secret": '343ji43j4n3jn4jk3n'})
//);
app.use(flash())
app.set('view engine', 'ejs');
app.use(session({
    secret: 'keyboard cat',
    cookie: {maxAge: 60000}
}));
app.use(flash());


// -------------------- Socket.io --------------------
// var socketEvents = require('./socketEvents');
// const io = require('socket.io').listen(server);
// socketEvents(io);
var http = require("http").Server(app);
var io = require("socket.io")(http);
var clients = {};
io.sockets.on('connection', function (socket) {
    console.log(clients);
    console.log('a user connected');

    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('add-user', function (data) {
        console.log("Adding new user, details:  " + util.inspect(data, false, null, true /* enable colors */));

        console.log('clients: ' + clients);
        clients[data.email] = {
            "socket": socket.id
        };
        console.log('clients: ' + clients);
        io.emit('newUserConnected', {
            allClients: clients
        });
    });


    socket.on('startVideoChat', function (data) {
        console.log('new request to start video: ' + data);
        console.log('data value: targetEmail: ' + data.targetEmail + ", userEmail: " + data.userEmail);
        console.log('--------------------------------');
        console.log('peerId: ' + data.peerId);
        console.log('--------------------------------');

        // sending to individual socketid

        var targetUserSocket = clients[data.targetEmail].socket;
        console.log('targetUserSocket is: ' + targetUserSocket + ' of mail: ' + data.targetEmail);
        socket.broadcast.to(targetUserSocket).emit('askForVideoChat', {
            requesterCode: data.peerId,
            requesterEmail: data.userEmail
        });
    });

    socket.on('answareVideoChat', function (data) {
        console.log('answare to start video: ' + data);
        console.log('data value: originalEmail: ' + data.originalEmail);
        console.log('--------------------------------');
        console.log('answaredId: ' + data.answaredId);
        console.log('--------------------------------');

        // sending to individual socketid
        var originalUserSocket = clients[data.originalEmail].socket;
        console.log('originalUserSocket is: ' + originalUserSocket + ' of mail: ' + data.originalEmail);
        socket.broadcast.to(originalUserSocket).emit('ansForVideoChat', {
            peerId: data.answaredId
        });
    });

    // socket.on('chat message', function (msg) {
    //     console.log('message: ' + msg);
    //     io.emit('chat message', msg);
    // });
});


// -------------------- Routes --------------------
// This responds with "Hello World" on the homepage
app.get('/', function (req, res) {
    app.use(express.static(__dirname + '/' + 'public'));
    console.log("");
    console.log("-------------------- Got a GET request for the homepage -------------------");
    console.log("the ssn");
    console.log("ssn is " + req.session.email);
    let msg = "test";
    res.render("profile", {person: req.session.email, message: msg});
});

app.get('/example', (req, res) => {
    io.emit('message', 'Hello world');
    res.sendStatus(200);
});

app.get('/login', function (req, res) {
    console.log("-------------------- Got a GET request for login  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    res.sendFile(__dirname + "/public/html/login.html");
});

app.post('/loginForm', async function (req, res) {
    console.log('loginForm: ' + req.body);
    var userName = req.body.userName;
    var password = req.body.password;
    console.log(`got userName: ${userName}, password: ${password}`);

    try {
        await sqlite3Sync.open('try.db');
        let sql = "SELECT * FROM reg_user WHERE email = '" + userName + "' AND password = '" + password + "'";
        console.log("sql query is: " + sql);
        r = await sqlite3Sync.get(sql);
        var isExist = r !== undefined;
        sqlite3Sync.close();
    } catch (e) {
        console.error('got error: ' + e);
        res.sendStatus(503);
        return;
    }

    // var isExist = isUserInDb(userName, password);
    console.log('isExist: ' + isExist);
    if (isExist) {
        console.log("user Exist!!!");
        req.session.email = userName;
        res.redirect('/');
    } else {
        res.sendStatus(404);
    }
});

app.post('/SignUpForm', async function (req, res) {

    console.log('signUpForm: ' + req.body.re_pass);
    console.log('signUpForm: ' + req.body.name);
    console.log('signUpForm: ' + req.body.email);
    console.log('signUpForm: ' + req.body.pass);

    try {
        await sqlite3Sync.open('try.db');
        let sql = `INSERT INTO reg_user(name, password,email) VALUES(?,?,?)`;
        console.log("sql query is: " + sql);
        let name = req.body.name;
        let password = req.body.re_pass;
        let email = req.body.email;
        var isAdded = await sqlite3Sync.run(sql, [name, password, email]);
        sqlite3Sync.close();
    } catch (e) {
        console.error('got error: ' + e);
        res.sendStatus(503);
        return;
    }

    // var i = addUserInDb(req.body.name, req.body.re_pass, req.body.email);
    console.log("isAdded: " + isAdded);
    if (isAdded) {
        res.redirect("/")
    } else {
        res.sendStatus(404);
    }

});

app.get('/index.js', browserify('./public/index.js'));


// -------------------- Start Server --------------------
console.log('Site Directory Name: ' + __dirname)
var server = http.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Video Chat App listening at http://%s:%s", host, port);
});


// -------------------- Data Base --------------------
async function isUserInDb(email, password) {
    console.log("Execting isUserInDb")
    let db = new sqlite3.Database('try.db', (err) => {
        if (err) {
            console.error(err.message);
            return false;
        }
        console.log('Connected to the in-memory SQlite database.');
    });

    let sql = "SELECT * FROM reg_user WHERE email = '" + email + "' AND password = '" + password + "'";
    console.log("sql query is: " + sql);

    // var isUserExist = false;
    // db.get(sql, [], (err, row) => {
    //     if (err) {
    //         throw err;
    //     }
    //     var res = row !== undefined;
    //     console.log('res = ' + res);
    //     isUserExist = res;
    // });

    function checkIfUserExist() {
        return new Promise(function (resolve, reject) {
            db.get(sql, [], (err, row) => {
                if (err) {
                    throw err;
                }
                var isUserExist = row !== undefined;
                resolve(isUserExist);
            });

            db.close((err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log('Close the database connection.');
            });
        });
    }

    // myPromise.then(function(value) {
    //     console.log('result from promise is: ' + value);
    // });

    // db.serialize(() => {
    //     db.each(sql, (err, row) => {
    //         if (err) {
    //             console.error(err.message);
    //         }
    //         console.log(row.name + "\t" + row.password);
    //         return true;
    //     });
    //     return false;
    // });


    var result = checkIfUserExist();
    console.log("return from await: " + result);
    return result;
}

async function addUserInDb(name, password, email) {
    let db = new sqlite3.Database('try.db', (err) => {
        if (err) {
            console.error(err.message);
            db.close((err) => {
                if (err) {
                    console.error(err.message);
                }
                console.log('Close the database connection.');
            });
            return false;
        }
        console.log('Connected to the in-memory SQlite database.');
    });


    function insertAsync() {
        return new Promise(function (resolve, reject) {
            db.run(`INSERT INTO reg_user(name, password,email) VALUES(?,?,?)`, [name, password, email], function (err) {
                if (err) {
                    console.log("err insert: " + err.message);
                    reject(err);
                } else {
                    // get the last insert id
                    console.log(`A row has been inserted with rowid: ${this.lastID}`);
                    db.close((err) => {
                        if (err) {
                            console.error(err.message);
                        }
                        console.log('Close the database connection.');
                        return true;
                    });
                    resolve();
                }
            });
        });
    }

    var isUserInserted = true;
    var res = await insertAsync().catch((err) => {
        console.log(err);
        isUserInserted = false;
    });
    console.log('res = ' + res);
    console.log('return from async function addUserInDb is: ' + isUserInserted);
    return isUserInserted;
}

function getSyncSqlite3() {
    const sqlite3 = require('sqlite3').verbose()
    var db = {};
    db.open = function (path) {
        return new Promise(function (resolve) {
            this.db = new sqlite3.Database(path,
                function (err) {
                    if (err) reject("Open error: " + err.message)
                    else resolve(path + " opened")
                }
            )
        })
    };

// any query: insert/delete/update
    db.run = function (query, params) {
        return new Promise(function (resolve, reject) {
            this.db.run(query, params,
                function (err) {
                    if (err) reject(err.message)
                    else resolve(true)
                })
        })
    };


// first row read
    db.get = function (query, params) {
        return new Promise(function (resolve, reject) {
            this.db.get(query, params, function (err, row) {
                if (err) reject("Read error: " + err.message)
                else {
                    resolve(row)
                }
            })
        })
    };

// set of rows read
    db.all = function (query, params) {
        return new Promise(function (resolve, reject) {
            if (params == undefined) params = []

            this.db.all(query, params, function (err, rows) {
                if (err)
                    reject("Read error: " + err.message);
                else {
                    resolve(rows)
                }
            })
        })
    };

// each row returned one by one
    db.each = function (query, params, action) {
        return new Promise(function (resolve, reject) {
            var db = this.db
            db.serialize(function () {
                db.each(query, params, function (err, row) {
                    if (err) reject("Read error: " + err.message)
                    else {
                        if (row) {
                            action(row)
                        }
                    }
                })
                db.get("", function (err, row) {
                    resolve(true)
                })
            })
        })
    };

    db.close = function () {
        return new Promise(function (resolve, reject) {
            this.db.close()
            resolve(true)
        })
    };
    return db;
}