var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    users = {};

server.listen(3000);

io.sockets.on('connection',function(socket){
    socket.on('new user',function(data, callback){
        if(data in users){
            callback(false);
        }
        else{
            callback(true);
            socket.nickname = data;
            users[socket.nickname] = socket;
            updateNicknames();
        }
    })


function updateNicknames() {
    io.sockets.emit('usernames',Object.keys(users));
}

socket.on('send message',function (data) {
    io.sockets.emit('new message',{msg:data,nick:socket.nickname});
});

socket.on('disconnect',function (data) {
    if(!socket.nickname) return;
    delete users[socket.nickname]
    updateNicknames();

});
});

app.get('/', function (req, res) {
    console.log("-------------------- Got a GET request for login  -------------------");

    res.sendFile(__dirname + "/socket_io_try.html");
});

// + "/public/html/login.html"