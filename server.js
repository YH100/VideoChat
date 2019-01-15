var express = require('express');
var browserify = require('browserify-middleware');
var app = express();

// -------------------- Socket.io --------------------
// var socketEvents = require('./socketEvents');
// const io = require('socket.io').listen(server);
// socketEvents(io);
var http = require("http").Server(app);
var io = require("socket.io")(http);
io.on("connection", () => {
    console.log("a user is connected");
});



// -------------------- Socket.io --------------------

// This responds with "Hello World" on the homepage
app.get('/', function (req, res) {
    app.use(express.static(__dirname + '/' + 'public'));
    console.log("");
    console.log("-------------------- Got a GET request for the homepage -------------------");
    res.sendFile(__dirname + "/" + "index.html");
});

app.get('/example', (req, res) => {
    io.emit('message', 'Hello world');
    res.sendStatus(200);
});

app.get('/index.js', browserify('./public/index.js'));

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
var server = http.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});