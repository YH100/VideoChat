var express = require('express');
var browserify = require('browserify-middleware');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');


app.use(express.static('public'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/xwww-
app.use(session({secret: 'XASDASDA'}));

var ssn;
var usersSockets = [];

var users = [
    {userName: 'yossi', password: '123456'},
    {userName: 'test', password: '123456'}];

// -------------------- Socket.io --------------------
// var socketEvents = require('./socketEvents');
// const io = require('socket.io').listen(server);
// socketEvents(io);
var http = require("http").Server(app);
var io = require("socket.io")(http);

io.on('connection', function (socket) {
    console.log('a user connected');
    usersSockets.push(socket);


    io.emit('newUser', {message: 'Hello everyone, a new user is connected'});
    // for (var i = 0; i < usersSockets.length; i++)
    // {
    //
    // }


    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
});
// -------------------- Socket.io --------------------


// -------------------- Routes --------------------
app.get('/', function (req, res) {
    // app.use(express.static(__dirname + '/' + 'public'));
    console.log("");
    console.log("-------------------- Got a GET request for the homepage -------------------");
    res.sendFile(__dirname + "/" + "index.html");
});

app.get('/login', function (req, res) {
    console.log("-------------------- Got a GET request for login  -------------------");
    res.sendFile(__dirname + "/public/html/login.html");
});

app.get('/example', (req, res) => {
    io.emit('message', 'Hello world');
    res.sendStatus(200);
});

app.get('/index.js', browserify('./public/index.js'));
// -------------------- Routes --------------------


// -------------------- Post Form Requests --------------------
app.post('/loginForm', function (req, res) {
    console.log('loginForm: ' + req.body);
    var userName = req.body.userName;
    var password = req.body.password;
    console.log(`got userName: ${userName}, password: ${password}`);

    var isUserExist = users.some(function (currentUser) {
        return currentUser.userName === userName &&
            currentUser.password === password;
    });

    if (isUserExist) {
        ssn = req.session;
        ssn.userName = userName;
        res.redirect("/");
        // res.send("Approve!");
    } else {
        res.send("Not Approve!");
    }
});
// -------------------- Post Form Requests --------------------


//+++++++++++++++++++++++++++++++++++server run+++++++++++++++++++++++++++++++++++++++++++++++++

var server = http.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});
//+++++++++++++++++++++++++++++++++++server run+++++++++++++++++++++++++++++++++++++++++++++++++