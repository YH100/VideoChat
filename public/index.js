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
            var otherId = JSON.parse(document.getElementById('otherId').value);
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
            // var video = document.createElement('video')
            // document.body.appendChild(video)
            var video = document.getElementById('videoMain')
            // video.src = window.URL.createObjectURL(stream)
            video.srcObject = stream;
            video.play();

            var endCallButton = document.getElementById('endCall')
            endCallButton.style.visibility = 'visible';
        })
    });
};

window.initiateVideoChat();