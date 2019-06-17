window.initiateVideoChat = function () {

    var getUserMedia = require('getusermedia');     //Loads the library code into the computer's immediate memory (ram)
    getUserMedia({video: true, audio: true}, function (err, stream) {
        if (err)
            return console.error(err);              //If there is an error, it will return it

        var startTime = window.performance.now();  //Checks how long it took to produce the code
        var Peer = require('simple-peer');         //Loads the library code into the computer's immediate memory (ram)
        var peer = new Peer({
            initiator: location.hash === '#init',  //Checks whether this client is initiating a call
            trickle: false,                        //Trickle (ICE) is an optimization of the ICE specification for NAT traversal
            stream: stream                         //Get the video ready to be send
        });

        peer.on('signal', function (data) {
            document.getElementById('yourId').value = JSON.stringify(data)
            var time = (window.performance.now() - startTime) / 1000;
            console.log(time + ' seconds');
        });

        document.getElementById('connect').onclick = function () {
            var otherIdTxt = document.getElementById('otherId').value;
            console.log('Other id is: ' + otherIdTxt.substr(0, 20));
            var otherId = JSON.parse(otherIdTxt);
            peer.signal(otherId);
        };

        document.getElementById('btnSend').onclick = function () {
            var textField = document.getElementById('textfield');
            var message = textField.value;
            if (message.length == 0)
            {
                alert("you cant send empty message");
                return;
            }
            textField.value = '';
            addNewMessage(message, true);
            peer.send(message);
        };

        // document.getElementById('send').addEventListener('click', function () {
        //     var yourMessage = document.getElementById('yourMessage').value;
        //     peer.send(yourMessage)
        // });

        peer.on('data', function (data) {
            // document.getElementById('messages').textContent += data + '\n';

            addNewMessage(data);
        });

        peer.on('stream', function (stream) {
            $('#callWithLbl')[0].innerHTML = 'In a call with: ' + window.targetUser;    //Set a label with the name of the ather client
            $('#closeMyVideoBtn')[0].style.visibility = 'visible';                      //Set my video btn to be visible
            $('#callButtons')[0].style.visibility = 'visible';
            $('#loading')[0].style.visibility = 'hidden';                               //Set the loding to be hidden
            var video = document.getElementById('videoMain');                //Creat the element for the main video stream
            video.srcObject = stream;
            video.play();                                                              //Strat the striming
            var elem = document.getElementById("videoMain");
            var bac = document.getElementById("mainfeed").style.backgroundImage = null;
            // Create also my video
            var myVideo = document.getElementById('myVideo');
            myVideo.setAttribute('playsinline', '');
            myVideo.setAttribute('autoplay', '');
            myVideo.setAttribute('muted', '');
            myVideo.style.width = '200px';                                            //Set the size of the video
            myVideo.style.height = '200px';

            /* Setting up the constraint */
            var facingMode = "user";                                                  // Can be 'user' or 'environment' to access back or front camera (NEAT!)
            var constraints = {
                audio: false,                                                         //dont play your mic audio
                video: {
                    facingMode: facingMode
                }
            };

            /* Stream it to video element */
            navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {     //Get my feed
                console.log('Start show my camera');
                myVideo.srcObject = stream;
            });

            var endCallButton = document.getElementById('endCall')
            endCallButton.style.visibility = 'visible';

            window.videoChatStat.isSendingVideo = true;
            window.videoChatStat.isSendingAudio = true;
        })
    });
};

function openFullscreen() {
    if (elem.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
        elem.webkitRequestFullscreen();
    }
}

window.initiateVideoChat();