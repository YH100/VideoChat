window.initiateVideoChat = function () {
    var getUserMedia = require('getusermedia');

    getUserMedia({video: true, audio: true}, function (err, stream) {
        if (err)
            return console.error(err);

        var startTime = window.performance.now();
        var Peer = require('simple-peer');
        var peer = new Peer({
            initiator: location.hash === '#init',
            trickle: false,
            stream: stream
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
            $('#callWithLbl')[0].innerHTML = 'In a call with: ' + window.targetUser;
            $('#closeMyVideoBtn')[0].style.visibility = 'visible';
            $('#loading')[0].style.visibility = 'hidden';
            // var video = document.createElement('video')
            // document.body.appendChild(video)
            var video = document.getElementById('videoMain')
            // video.src = window.URL.createObjectURL(stream)
            video.srcObject = stream;
            video.play();


            // Create also my video
            var myVideo = document.getElementById('myVideo');
            myVideo.setAttribute('playsinline', '');
            myVideo.setAttribute('autoplay', '');
            myVideo.setAttribute('muted', '');
            myVideo.style.width = '200px';
            myVideo.style.height = '200px';

            /* Setting up the constraint */
            var facingMode = "user"; // Can be 'user' or 'environment' to access back or front camera (NEAT!)
            var constraints = {
                audio: false,
                video: {
                    facingMode: facingMode
                }
            };

            /* Stream it to video element */
            navigator.mediaDevices.getUserMedia(constraints).then(function success(stream) {
                console.log('Start show my camera');
                myVideo.srcObject = stream;
            });





            var endCallButton = document.getElementById('endCall')
            endCallButton.style.visibility = 'visible';
        })
    });
};

window.initiateVideoChat();