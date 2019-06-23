// -------------------- Requires --------------------
const express = require('express');
const browserify = require('browserify-middleware');
const session = require('express-session');
const app = express();
const mailer = require('express-mailer');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const sqlite3Sync = getSyncSqlite3();
const sqlite3 = require('sqlite3').verbose();
const flash = require('connect-flash-plus');
const redis = require("redis");
const util = require('util');
const simpleNodeLogger = require('simple-node-logger');


// -------------------- Logging --------------------
// create a custom timestamp format for log statements
const opts = {
    logFilePath: 'mylogfile.log',
    timestampFormat: 'YYYY-MM-DD HH:mm:ss.SSS'
};
var log = simpleNodeLogger.createSimpleLogger(opts);


// -------------------- app.use --------------------
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/xwww-
//app.use(session(
//    {"secret": '343ji43j4n3jn4jk3n'})
//);
app.use(flash());
app.set('view engine', 'ejs');
app.use(session({
    secret: 'keyboard cat',
    cookie: {maxAge: 60000}
}));
app.use(flash());

var passwordRecoveries = {}; // { email -> code }


// -------------------- Socket.io --------------------
var http = require("http").Server(app);
var io = require("socket.io")(http);
var clients = {}; // { email -> {"socket": 12345} }
var clientsOnCall = new Set();

io.sockets.on('connection', function (socket) {

    //********************Socket io function general use***************
    //                                                               **
    //The socket io function is used to update the client            **
    // on real-time information without needing to update the page   **
    //                                                               **
    //*****************************************************************
    log.info('new user connected with socket id: ' + socket.id);

    //********************Socket io connection function ***************
    //                                                               **
    //Updating a list of clients that connected to the system        **
    //                                                               **
    //---------------------------------------------------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    log.info("Clients state: " + util.inspect(clients, false, null, true /* enable colors */));

    //***Socket io disconnect function - General use ******************
    //                                                               **
    //Updating a list of clients that disconnected to the system     **
    //                                                               **
    //----------------------Variables Setting -----------------------**
    //                                                               **
    //socket.id = The socket ID given by the socket io function      **
    //clients = List of clients that connected to the system (see    **
    //          line 31 For further information)                     **
    //                                                               **
    //----------------------Internal functions ----------------------**
    //                                                               **
    //getUserEmailBySocketId = get the user email according to his id**
    //                                                               **
    //-----------------------Socket io function ---------------------**
    //                                                               **
    //This function use io.emit socket io function.                  **
    //This function emit an event to all connected sockets           **
    //see this web site for further information:                     **
    // https://socket.io/docs/                                       **
    //                                                               **
    //-----------------------debugging function ---------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    socket.on('disconnect', function () {
        log.info('----- Socket io function: disconnect called -----');
        log.info('deleting user, with socket id: ' + socket.id);


        log.info('clients before: ' + util.inspect(clients, false, null, true /* enable colors */));
        var userEmail = getUserEmailBySocketId(clients, socket.id);
        log.info('the user email is: ' + userEmail);
        delete clients[userEmail];
        log.info('clients after: ' + util.inspect(clients, false, null, true /* enable colors */));

        clientsOnCall.delete(userEmail);
        io.emit('clientsOnCallUpdate', Array.from(clientsOnCall));

        io.emit('contactListChanged', {
            allClients: clients
        });
        log.info('--------------------------------');
    });

    //***Socket io add-user function - General use ********************
    //                                                               **
    //Updating a list of clients that connected to the system        **
    //                                                               **
    //----------------------Variables Setting -----------------------**
    //                                                               **
    //clients = List of clients that connected to the system (see    **
    //          line 31 For further information)                     **
    //                                                               **
    //-----------------------Socket io function ---------------------**
    //                                                               **
    //This function use io.emit socket io function.                  **
    //This function emit an event to all connected sockets           **
    //see this web site for further information:                     **
    // https://socket.io/docs/                                       **
    //                                                               **
    //-----------------------debugging function ---------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    socket.on('add-user', function (data) {
        log.info('-----Socket io function: add-user called -----');
        log.info("Adding new user, details:  " + util.inspect(data, false, null, true /* enable colors */));
        io.emit('clientsOnCallUpdate', Array.from(clientsOnCall));
        log.info('clients before: ' + util.inspect(clients, false, null, true /* enable colors */));
        clients[data.email] = {
            "socket": socket.id
        };
        log.info('clients after: ' + util.inspect(clients, false, null, true /* enable colors */));
        io.emit('contactListChanged', {
            allClients: clients
        });
        log.info('--------------------------------');
    });

    //***Socket io startVideoChat function - General use **************
    //                                                               **
    //Sending a request to start a conversation                      **
    //                                                               **
    //----------------------Variables Setting -----------------------**
    //                                                               **
    //data.targetEmail = the email of getting a call                 **
    //data.userEmail = the email of Asking for a call                **
    //targetUserSocket = the socket id of getting a call             **
    //data.peerId = the peer id of Asking for a call                 **
    //                                                               **
    //-----------------------Socket io function ---------------------**
    //                                                               **
    //This function use socket.broadcast.to socket io function.      **
    //This function emit an event to individual socket id            **
    //see this web site for further information:                     **
    // https://socket.io/docs/emit-cheatsheet/                       **
    //                                                               **
    //-----------------------node js function -----------------------**
    //                                                               **
    //The hasOwnProperty() method returns a boolean indicating       **
    // whether the object has the specified property as its          **
    // own property                                                  **
    //see this web site for further information:                     **
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/       **
    // Reference/Global_Objects/Object/hasOwnProperty                **
    //                                                               **
    //-----------------------debugging function ---------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    socket.on('startVideoChat', function (data) {
        log.info('----- Socket io function: startVideoChat called -----');
        log.info('new request to start video: ' + data);
        log.info('data value: targetEmail: ' + data.targetEmail + ", userEmail: " + data.userEmail);
        log.info('--------------------------------');
        log.info('peerId: ' + data.peerId.substring(0, 20));
        log.info('--------------------------------');

        // sending to individual socketid


        if (!clients.hasOwnProperty(data.targetEmail))
            log.info(`user ${data.userEmail} tried to call: ${data.targetEmail}, but he is not exist in the server! clients: ${util.inspect(clients, false, null, true)}`);
        else {
            var targetUserSocket = clients[data.targetEmail].socket;
            log.info('targetUserSocket is: ' + targetUserSocket + ' of mail: ' + data.targetEmail);
            socket.broadcast.to(targetUserSocket).emit('askForVideoChat', {
                requesterCode: data.peerId,
                requesterEmail: data.userEmail
            });
        }
        log.info('--------------------------------');
    });

    //***Socket io answareVideoChat function - General use ************
    //                                                               **
    //Sending a answer to start a conversation                       **
    //                                                               **
    //----------------------Variables Setting -----------------------**
    //                                                               **
    //data.originalEmail = the email of Asking for a call            **
    //data.answaredId = the peer id of getting for a call            **
    //                                                               **
    //-----------------------Socket io function ---------------------**
    //                                                               **
    //This function use socket.broadcast.to socket io function.      **
    //This function emit an event to individual socket id            **
    //see this web site for further information:                     **
    // https://socket.io/docs/emit-cheatsheet/                       **
    //                                                               **
    //-----------------------node js function -----------------------**
    //                                                               **
    //The hasOwnProperty() method returns a boolean indicating       **
    // whether the object has the specified property as its          **
    // own property                                                  **
    //see this web site for further information:                     **
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/       **
    // Reference/Global_Objects/Object/hasOwnProperty                **
    //                                                               **
    //-----------------------debugging function ---------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    socket.on('answareVideoChat', function (data) {
        log.info('----- Socket io function: answareVideoChat called -----');
        log.info('answare to start video: ' + data);
        log.info('data value: originalEmail: ' + data.originalEmail);
        log.info('answaredId: ' + data.answaredId.substring(0, 20));

        // sending to individual socketid

        if (!clients.hasOwnProperty(data.originalEmail))
            log.info(`user ${data.originalEmail} is not in the server! clients: ${util.inspect(clients, false, null, true)}`);
        else {
            var originalUserSocket = clients[data.originalEmail].socket;
            log.info('originalUserSocket is: ' + originalUserSocket + ' of mail: ' + data.originalEmail);
            socket.broadcast.to(originalUserSocket).emit('ansForVideoChat', {
                peerId: data.answaredId
            });
        }
        log.info('--------------------------------');
    });

    //***Socket io denyVideoChat function - General use ************
    socket.on('denyVideoChat', function (data) {
        log.info('----- Socket io function: denyVideoChat called -----');
        log.info('deny user: ' + data.denyUser);
        log.info('deniedUser user: ' + data.deniedUser);

        // sending to individual socketid
        if (!clients.hasOwnProperty(data.deniedUser))
            log.info(`user ${data.deniedUser} is not in the server! clients: ${util.inspect(clients, false, null, true)}`);
        else {
            var deniedUserSocket = clients[data.deniedUser].socket;
            log.info('denied UserSocket is: ' + deniedUserSocket + ' of mail: ' + data.deniedUser);
            socket.broadcast.to(deniedUserSocket).emit('deniedVideoChat', {
                denyUser: data.denyUser
            });
        }
        log.info('--------------------------------');
    });

    //***Socket io videoChatCreated function - General use ************
    //                                                               **
    //updating a list with active calls                              **
    //                                                               **
    //----------------------Variables Setting -----------------------**
    //                                                               **
    //clientsOnCall = list with client email how is in call          **
    //data.originalUser = the email of Asking for a call             **
    //data.targetUser = the socket id of getting a call              **
    //                                                               **
    //-----------------------Socket io function ---------------------**
    //                                                               **
    //This function use io.emit socket io function.                  **
    //This function emit an event to all connected sockets           **
    //see this web site for further information:                     **
    // https://socket.io/docs/                                       **
    //                                                               **
    //-----------------------node js function -----------------------**
    //                                                               **
    //The Array.from() method returns an Array object from any object**
    // with a length property                                        **
    //see this web site for further information:                     **
    //https://www.w3schools.com/jsref/jsref_from.asp                 **
    //                                                               **
    //-----------------------debugging function ---------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    socket.on('videoChatCreated', function (data) {
        log.info('----- Socket io function: videoChatCreated called -----');
        clientsOnCall.add(data.originalUser);
        clientsOnCall.add(data.targetUser);
        log.info('clients currently on call: ' + util.inspect(clientsOnCall, false, null, true));
        io.emit('clientsOnCallUpdate', Array.from(clientsOnCall));
        log.info('--------------------------------');
    });

    //***Socket io endCall function - General use *********************
    //                                                               **
    //updating a list with active calls                              **
    //                                                               **
    //----------------------Variables Setting -----------------------**
    //                                                               **
    //clientsOnCall = list with client email how is in call          **
    //data.originalUser = the email of Asking for a call             **
    //                                                               **
    //-----------------------Socket io function ---------------------**
    //                                                               **
    //This function use io.emit socket io function.                  **
    //This function emit an event to all connected sockets           **
    //see this web site for further information:                     **
    // https://socket.io/docs/                                       **
    //                                                               **
    //-----------------------node js function -----------------------**
    //                                                               **
    //The Array.from() method returns an Array object from any object**
    // with a length property                                        **
    //see this web site for further information:                     **
    //https://www.w3schools.com/jsref/jsref_from.asp                 **
    //                                                               **
    //-----------------------debugging function ---------------------**
    //                                                               **
    //This function use util.inspect tool for debugging purposes only**
    //util.inspect returns a string representation of an object      **
    //see this web site for further information:                     **
    //https://nodejs.org/api/util.html                               **
    //                                                               **
    //*****************************************************************
    socket.on('endCall', function (data) {
        log.info('----- Socket io function: endCall called -----');
        clientsOnCall.delete(data.originalUser);
        // clientsOnCall.delete(OTHER);
        log.info('clients currently on call: ' + util.inspect(clientsOnCall, false, null, true));
        io.emit('clientsOnCallUpdate', Array.from(clientsOnCall));
        log.info('--------------------------------');
    });

});


// -------------------- Routes --------------------

//********************app.get() function general use***************
//                                                               **
// refers to how an application’s endpoints (URIs) respond to    **
// client requests.                                              **
//                                                               **
//*****************************************************************

//****************Express app.get('/',...) function ***************
//                                                               **
//send the video html page(main page)                            **
//                                                               **
//---------------------------Route methods-----------------------**
//                                                               **
//This function use app.get method for listen to / in the url    **
//This function return data the the client using res.render      **
//method using view template.                                    **
//see this web site for further information:                     **
//https://expressjs.com/en/guide/routing.html                    **
//                                                               **
//----------------------Variables Setting -----------------------**
//                                                               **
//req.session.email = the email of the client                    **
//                                                               **
//---------------------------session methods---------------------**
//                                                               **
//This function use session method for saving client data        **
//see this web site for further information:                     **
//https://www.npmjs.com/package/express-session                  **
//                                                               **
//*****************************************************************
app.get('/', function (req, res) {
    log.info("-------------------- Got a GET request for the homepage -------------------");
    if (req.session.email)
        log.info('email of the user is: ' + req.session.email);

    if (req.session.email == null) {
        res.redirect('login');
    }
    app.use(express.static(__dirname + '/' + 'public'));
    log.info("The session email is " + req.session.email);
    let msg = "test";
    res.render("profile", {person: req.session.email, message: msg});
});

app.get('/example', (req, res) => {
    log.info("-------------------- Got a GET request for example -------------------");
    io.emit('message', 'Hello world');
    res.sendStatus(200);
});

app.get('/login', function (req, res) {
    log.info("-------------------- Got a GET request for login  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    res.sendFile(__dirname + "/public/html/login.html");
});

app.post('/loginForm', async function (req, res) {
    log.info("-------------------- Got a Post request for login form -------------------");
    log.info('loginForm: ' + req.body);
    var userName = req.body.userName;
    var password = req.body.password;
    log.info(`got userName: ${userName}, password: ${password}`);

    try {
        await sqlite3Sync.open('try.db');
        let sql = "SELECT * FROM Users WHERE Email = '" + userName + "' AND Password = '" + password + "'";
        log.info("sql query is: " + sql);
        r = await sqlite3Sync.get(sql);
        var isExist = r !== undefined;
        sqlite3Sync.close();
    } catch (e) {
        console.error('got error: ' + e);
        res.sendStatus(503);
        return;
    }

    // var isExist = isUserInDb(userName, password);
    log.info('isExist: ' + isExist);
    if (isExist) {
        log.info("user Exist!!!");
        req.session.email = userName;
        req.session.cookie.expires = false;
        res.redirect('/');
    } else {
        let msg = "Username or password incorrect";
        res.render("login", {message: msg});
    }
});

app.post('/SignUpForm', async function (req, res) {
    log.info("-------------------- Got a Post request for SignUpForm -------------------");

    var nickName = req.body.nickName;
    var password = req.body.pass;
    var rePassword = req.body.re_pass;
    var email = req.body.email;

    log.info('signUpForm password: ' + password);
    log.info('signUpForm re password: ' + rePassword);
    log.info('signUpForm nickName: ' + nickName);
    log.info('signUpForm email: ' + email);

    try {
        await sqlite3Sync.open('try.db');

        let checkIfsql = `select count(case when NickName = '${nickName}' then 1 end) >= 1 as IsNickExist,
                                 count(case when Email = '${email}' then 1 end) >= 1 as IsEmailExist
                          from Users`;

        log.info("sql query to check if nick namd and email already exist is:\n" + checkIfsql);
        var result = await sqlite3Sync.get(checkIfsql);
        if (result.IsNickExist == 1) {
            var msg = `nickName: ${nickName} already exist`;
            log.info(msg);
            res.render("login", {message: msg});
            return;
        } else if (result.IsEmailExist == 1) {
            var msg = `email: ${email} already exist`;
            log.info(msg);
            res.render("login", {message: msg});
            return;
        }
        let sql = `INSERT INTO Users(NickName, Password, Email) VALUES(?,?,?)`;
        log.info("sql query for insert new user is: " + sql);

        var isAdded = await sqlite3Sync.run(sql, [nickName, password, email]);
        sqlite3Sync.close();
    } catch (e) {
        console.error('got error: ' + e);
        res.sendStatus(503);
        return;
    }

    // var i = addUserInDb(req.body.name, req.body.re_pass, req.body.email);
    log.info("isAdded: " + isAdded);
    if (isAdded) {
        req.session.email = email;
        res.redirect("/")
    } else {
        res.sendStatus(404);
    }

});

app.get('/index.js', browserify('./public/index.js'));

app.post('/passwordRecoveryStep3', async function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecoveryStep3  -------------------");
    var newPassword = req.body.password;
    var email = req.session.email;

    log.info(`PasswordRecoveryStep3: new password: ${newPassword}, email: ${email}`);

    try {
        await sqlite3Sync.open('try.db');
        let sql = "UPDATE Users SET Password = '" + newPassword + "' WHERE Email = '" + email + "'";
        log.info("sql query is: " + sql);
        sqlite3Sync.run(sql, function (err) {
            if (err) {
                log.info("err insert: " + err.message);
            } else {
                db.close((err) => {
                    if (err) {
                        console.error(err.message);
                    }
                    log.info('Close the database connection.');
                    return true;
                });

                passwordRecoveries[email] = null;

                let msg = "Your password changed successfully";
                res.render("login.", {message: msg});
            }
        });
        sqlite3Sync.close();
        res.redirect('login');
    } catch (e) {
        console.error('got error: ' + e);
        res.sendStatus(503);
        return;
    }
});

app.post('/passwordRecoveryStep2', function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecoveryStep2  -------------------");
    var code = req.body.code;
    var email = req.session.email;

    log.info(`PasswordRecoveryStep2: code: ${code}, email: ${email}`);

    if (passwordRecoveries[email] == code) {
        log.info('success');
        res.redirect('passwordRecoveryStep3Form');
    } else {
        var msg = 'code is not correct';
        log.info(msg);
        res.render("passwordRecoveryStep2", {message: msg});
    }
});

app.post('/passwordRecovery', async function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecovery  -------------------");
    var email = req.body.email;
    log.info('email: ' + email);

    req.session.email = email;

    try {
        await sqlite3Sync.open('try.db');
        let sql = "SELECT * FROM Users WHERE Email = '" + email + "'";
        log.info("sql query is: " + sql);
        r = await sqlite3Sync.get(sql);
        var isExist = r !== undefined;
        log.info('isExist: ' + isExist);
        sqlite3Sync.close();
    } catch (e) {
        console.error('got error: ' + e);
        res.sendStatus(503);
        return;
    }

    if (isExist) {
        var code = Math.floor(100000 + Math.random() * 900000);
        passwordRecoveries[email] = code;

        log.info(`Password recovery code is: ${code} for email: ${email}`);

        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'yhvideochat2019@gmail.com',
                pass: 'VideoChat1234'
            }
        });

        var mailOptions = {
            from: 'yhvideochat2019@gmail.com',
            to: email,
            subject: 'Password Recovery for your Simple Connect Account',
            text: 'Your password recovery code is: ' + code
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                log.error(error);
            } else {
                log.info('Email sent: ' + info.response);
            }
        });

        res.redirect('passwordRecoveryStep2Form');
    } else {
        let msg = "Email is not exist";
        log.info(msg);
        // res.render("passwordRecovery.", {message: msg});
        res.redirect('passwordRecoveryErrorForm');
    }
});

app.get('/passwordRecoveryForm', function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecovery  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    res.sendFile(__dirname + "/public/html/passwordRecovery.html");
});

app.get('/passwordRecoveryStep2Form', function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecoveryStep2Form  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    res.sendFile(__dirname + "/public/html/passwordRecoveryStep2.html");
});

app.get('/passwordRecoveryStep3Form', function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecoveryStep3Form  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    res.sendFile(__dirname + "/public/html/passwordRecoveryStep3.html");
});

app.get('/passwordRecoveryErrorForm', function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecoveryErrorForm  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    var msg = 'email is not correct';
    log.info(msg);
    res.render("passwordRecovery", {message: msg});
});

app.get('/passwordRecoveryError2Form', function (req, res) {
    log.info("-------------------- Got a GET request for passwordRecoveryError2Form  -------------------");
    app.use(express.static(__dirname + '/' + 'public'));
    var msg = 'code is not correct';
    log.info(msg);
    res.render("passwordRecoveryStep2", {message: msg});
});

// -------------------- Start Server --------------------
log.info('Site Directory Name: ' + __dirname);
var server = http.listen(8081, function () {
    var host = server.address().address;
    var port = server.address().port;
    log.info("Video Chat App listening at http://%s:%s", host, port);
});


// -------------------- Data Base --------------------
async function isUserInDb(email, password) {
    log.info("Execting isUserInDb");
    let db = new sqlite3.Database('try.db', (err) => {
        if (err) {
            console.error(err.message);
            return false;
        }
        log.info('Connected to the in-memory SQlite database.');
    });

    let sql = "SELECT * FROM Users WHERE Email = '" + email + "' AND Password = '" + password + "'";
    log.info("sql query is: " + sql);

    // var isUserExist = false;
    // db.get(sql, [], (err, row) => {
    //     if (err) {
    //         throw err;
    //     }
    //     var res = row !== undefined;
    //     log.info('res = ' + res);
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
                log.info('Close the database connection.');
            });
        });
    }

    // myPromise.then(function(value) {
    //     log.info('result from promise is: ' + value);
    // });

    // db.serialize(() => {
    //     db.each(sql, (err, row) => {
    //         if (err) {
    //             console.error(err.message);
    //         }
    //         log.info(row.name + "\t" + row.password);
    //         return true;
    //     });
    //     return false;
    // });


    var result = checkIfUserExist();
    log.info("return from await: " + result);
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
                log.info('Close the database connection.');
            });
            return false;
        }
        log.info('Connected to the in-memory SQlite database.');
    });


    function insertAsync() {
        return new Promise(function (resolve, reject) {
            db.run(`INSERT INTO Users(NickName, Password, Email) VALUES(?,?,?)`, [name, password, email], function (err) {
                if (err) {
                    log.info("err insert: " + err.message);
                    reject(err);
                } else {
                    // get the last insert id
                    log.info(`A row has been inserted with rowid: ${this.lastID}`);
                    db.close((err) => {
                        if (err) {
                            console.error(err.message);
                        }
                        log.info('Close the database connection.');
                        return true;
                    });
                    resolve();
                }
            });
        });
    }

    var isUserInserted = true;
    var res = await insertAsync().catch((err) => {
        log.info(err);
        isUserInserted = false;
    });
    log.info('res = ' + res);
    log.info('return from async function addUserInDb is: ' + isUserInserted);
    return isUserInserted;
}

function getSyncSqlite3() {
    const sqlite3 = require('sqlite3').verbose();
    var db = {};
    db.open = function (path) {
        return new Promise(function (resolve) {
            this.db = new sqlite3.Database(path,
                function (err) {
                    if (err)
                        reject("Open error: " + err.message)
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
                    if (err)
                        reject(err.message);
                    else resolve(true)
                })
        })
    };

// first row read
    db.get = function (query, params) {
        return new Promise(function (resolve, reject) {
            this.db.get(query, params, function (err, row) {
                if (err)
                    reject("Read error: " + err.message);
                else {
                    resolve(row)
                }
            })
        })
    };

// set of rows read
    db.all = function (query, params) {
        return new Promise(function (resolve, reject) {
            if (params == undefined) params = [];

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
            var db = this.db;
            db.serialize(function () {
                db.each(query, params, function (err, row) {
                    if (err) reject("Read error: " + err.message)
                    else {
                        if (row) {
                            action(row)
                        }
                    }
                });
                db.get("", function (err, row) {
                    resolve(true)
                })
            })
        })
    };

    db.close = function () {
        return new Promise(function (resolve, reject) {
            this.db.close();
            resolve(true);
        })
    };
    return db;
}

function getUserEmailBySocketId(allClients, socketId) {
    log.info('start');
    for (var key in allClients) {
        log.info(key);
        if (allClients.hasOwnProperty(key)) {
            if (allClients[key].socket === socketId)
                return key;
        }
    }
}