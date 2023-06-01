const puppeteer = require('puppeteer');
const WebSocket = require('ws');

exports.Server = async function () {
    // Launch a headless Chrome browser instance
    const browser = await puppeteer.launch({
        devtools: false,
        headless: true,
        // defaultViewport :null,
        args: [
            '--use-fake-ui-for-media-stream', // Allow access to microphone and camera
            '--use-fake-device-for-media-stream', // Use fake microphone and camera devices
            // '--allow-file-access',
            // '--use-file-for-fake-video-capture="/Users/mrudulkatla/personal/bot_server/test_video.mp4"',
            '--no-sandbox', // Required in Docker container
            '--disable-setuid-sandbox' // Required in Docker container
        ],
    });

    // Create a new page in the browser
    const page = await browser.newPage();

    // Navigate to the WebRTC conference call
    await page.goto('http://localhost:8080/room/e594c09a-34fb-4935-af4f-f6a99c9d331e');

    // Get the WebSocket address for the signaling server
    const wsAddress = await page.evaluate(() => {
        return 'ws://localhost:8080/room/e594c09a-34fb-4935-af4f-f6a99c9d331e/websocket'; // Replace with your own WebSocket address
    });

    // Connect to the signaling server over WebSocket
    const ws = new WebSocket(wsAddress);
    console.log("ws")

    // When the WebSocket connection is open, create a new WebRTC peer connection
    ws.onopen = async () => {
        const peerConnection = new RTCPeerConnection();
        comsole.log("peerConnection data:", peerConnection)


        // Add the bot's audio track to the peer connection
        const botAudioTrack = await page.evaluate(() => {
            comsole.log("botAudioTrack data:", botAudioTrack)
            // Implement this function to get the bot's audio track from the page
            // For example, you can use navigator.mediaDevices.getUserMedia() to get the audio track
            // and return it as a MediaStreamTrack object.
        });
        // peerConnection.addTrack(botAudioTrack);
        // When the peer connection receives an ICE candidate, send it to the other participants
        peerConnection.onicecandidate = event => {
            comsole.log("event data:", event)
            if (event.candidate) {
                ws.send(JSON.stringify({
                    type: 'iceCandidate',
                    candidate: event.candidate,
                }));
            }
        };

        peerConnection.ontrack = function (event) {
           
            if (event.track.kind === 'audio') {
                console.log("Only audio found, so returning!!")
                return
            }

            console.log("peer stream 1")
        }

        // When the peer connection receives a remote stream, add it to the audio element and start recording
        // peerConnection.ontrack = event => {
        //     const remoteStream = event.streams[0];
        //     const audioContext = new AudioContext();
        //     const source = audioContext.createMediaStreamSource(remoteStream);
        //     const recorder = new MediaRecorder(source);

        //     // Implement the "ondataavailable" event to handle the recorded audio data
        //     recorder.ondataavailable = event => {
        //         const recordedAudioData = event.data;
        //         console.log(recordedAudioData)
        //         // Do something with the recorded audio data, e.g. save to file or upload to server
        //     };

        //     // Start recording
        //     // recorder.start();
        // };

        ws.ontrack = (e) => {
            console.log("Received Tracks");
    
            if (e.streams.length === 0) {
                console.error("No streams found in event");
                return;
            }
    
            const stream = e.streams[0];
            partnerVideo.current.srcObject = stream;
    
            peerStream = audioContext.createMediaStreamSource(stream)
    
            // mediaStreams.push(e.streams[0].getAudioTracks());
    
            // const audioTracks = stream.getAudioTracks();
            // if (audioTracks.length === 0) {
            //     console.error("No audio tracks found in stream");
            //     return;
            // }
    
            console.log("Successfully obtained audio stream");
        };

        // When the WebSocket receives a message, handle it appropriately
        ws.onmessage = event => {
            const message = JSON.parse(event.data);

            switch (message.type) {
                case 'offer':
                    // Set the remote description and create an answer
                    peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
                    peerConnection.createAnswer()
                        .then(answer => {
                            peerConnection.setLocalDescription(answer);
                            // Send the answer to the other participants
                            ws.send(JSON.stringify({
                                type: 'answer',
                                answer: answer,
                            }));
                        });
                    break;

                case 'iceCandidate':
                    // Add the ICE candidate to the peer connection
                    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                    break;

                default:
                    console.warn('Invalid message type:', message.type);
                    break;
            }
        };

        // When the WebSocket connection is // closed, close the peer connection
        ws.onclose = () => {
            peerConnection.close();
        };
    };

    // When the WebSocket connection encounters an error, log it
    // ws.onerror = event => {
    //     console.error('WebSocket error:', event);
    // };
};
