var express = require('express');
var browserify = require('browserify-middleware');
var app = express();
var bodyParser = require('body-parser');
//var session = require('express-session');
const sqlite3 = require('sqlite3').verbose();


//app.use(express.static('public'));
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/xwww-
//app.use(session({secret: 'XASDASDA'}));



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

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++sql++++++++++++++++++++++++++++++++++=
function isUserInDb(email,password){
    console.log("we are in the isUserInDb")
    let db = new sqlite3.Database('try.db', (err) => {
        if (err) {
            console.error(err.message);
            return false;
        }
        console.log('Connected to the in-memory SQlite database.');
    });

    var sql = "SELECT * FROM reg_user WHERE email = '" + email + "' AND password = '"+ password + "'" ;
    console.log("sql query is: " + sql);
    db.serialize(() => {
        db.each(sql, (err, row) => {
            if (err) {
                console.error(err.message);
            }
            console.log(row.name + "\t" + row.password);
            return true;
        });
        return false;
    });
    db.close((err) => {
        if (err) {
            console.error(err.message);
        }
        console.log('Close the database connection.');
    });
    return false;
}

function addUserInDb(name, password,email){
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

    db.run(`INSERT INTO reg_user(name, password,email) VALUES(?,?,?)`, [name, password,email], function(err) {
        if (err) {
            console.log("err insert")
            console.log(err.message);
            //           return false;
        }
        console.log("insert true");
        return true;

        // get the last insert id
        console.log(`A row has been inserted with rowid ${this.lastID}`);
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Close the database connection.');
            return true;
        });

    });
    return true;
}
//+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++sql+++++++++++++++++++++++++++++++++

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

app.get('/login', function (req, res) {
    console.log("-------------------- Got a GET request for login  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    res.sendFile(__dirname + "/public/html/login.html");
});

app.post('/loginForm', function (req, res) {
    console.log('loginForm: ' + req.body);
    var userName = req.body.userName;
    var password = req.body.password;
    console.log(`got userName: ${userName}, password: ${password}`);
    console.log("the user is in db?" + isUserInDb(userName,password))
    if (isUserInDb(userName,password))
    {
        console.log("1");
        res.sendFile(__dirname + "/public/html/login.html");
    }
    res.sendStatus(404);
});

app.post('/SignUpForm', function (req, res){

    console.log('signUpForm: ' + req.body.re_pass);
    console.log('signUpForm: ' + req.body.name);
    console.log('signUpForm: ' + req.body.email);
    console.log('signUpForm: ' + req.body.pass);
    var i = addUserInDb(req.body.name,req.body.re_pass,req.body.email);
    console.log("i is " + i);
    if(i){
        res.redirect("/")
    }
    else{
        res.sendStatus(404);
    }

});




app.get('/index.js', browserify('./public/index.js'));

//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
var server = http.listen(8082, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("Example app listening at http://%s:%s", host, port);
});