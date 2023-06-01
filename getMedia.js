import React, { useEffect, useRef } from "react";
import "../css/styles.css"
import "../css/imageBody.css"

const Room = (props) => {
    const userVideo = useRef();
    const userStream = useRef();
    const partnerVideo = useRef();
    const peerRef = useRef();
    const webSocketRef = useRef();
    const audioContext = new AudioContext();
    let localAudioStream;
    let localStream;
    let peerStream;
    let dest;

    const openCamera = async () => {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter(
            (device) => device.kind == "videoinput"
        );
        console.log(cameras);

        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 48000,
                suppressLocalAudioPlayback: true
              },
            video: {
                deviceId: cameras[0].deviceId,
            },
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.log(err);
        }
    };

    useEffect(() => {
        openCamera().then((stream) => { 
            userVideo.current.srcObject = stream;
            userStream.current = stream;
            localAudioStream = stream;

            localStream = audioContext.createMediaStreamSource(stream)

            webSocketRef.current = new WebSocket(
                // `wss://video-chat-app-4xbefckriq-uw.a.run.app/join?roomID=${props.match.params.roomID}`
                `ws://localhost:8080/join?roomID=${props.match.params.roomID}`
            );

            webSocketRef.current.addEventListener("open", () => {
                webSocketRef.current.send(JSON.stringify({ join: true }));
            });

            webSocketRef.current.addEventListener("message", async (e) => {
                const message = JSON.parse(e.data);

                if (message.join) {
                    callUser();
                }

				if (message.offer) {
                    console.log("Handling an offer!!")
                    handleOffer(message.offer);
                }

                if (message.answer) {
                    console.log("Receiving Answer");
                    peerRef.current.setRemoteDescription(
                        new RTCSessionDescription(message.answer)
                    );
                }

                if (message.iceCandidate) {
                    console.log("Receiving and Adding ICE Candidate");
                    try {
                        await peerRef.current.addIceCandidate(
                            message.iceCandidate
                        );
                    } catch (err) {
                        console.log("Error Receiving ICE Candidate", err);
                    }
                }

                // if (message.recordingStarted && IsHost == 1) {
                //     audioRecorder = new MediaRecorder(new MediaStream([audioTrack]), {
                //         mimeType: 'audio/webm;codecs=opus'
                //       });
                //         // mediaRecorder = new MediaRecorder(stream);
                //         // mediaRecorder.mimeType = 'video/webm';
                //         console.log("Entered the code!!")
                //         audioRecorder.ondataavailable = (event) => {
                //             console.log("Waiting for the ondataavailable event to be triggered!!")
                //             if (event.data.size > 0) {
                //                 console.log("Data discovered!!")
                //                 webSocketRef.current.send(event.data);
                //             }
                //         };
                //         audioRecorder.start(3000);
                // }

                // if (message.recordOffer) {
                //     webSocketRef.current.send(JSON.stringify({ recordingStarted: true }));
                //     audioRecorder = new MediaRecorder(new MediaStream([audioTrack]), {
                //         mimeType: 'audio/webm;codecs=opus'
                //       });
                //         console.log("Entered the code!!")
                //         audioRecorder.ondataavailable = (event) => {
                //             console.log("Waiting for the ondataavailable event to be triggered!!")
                //             if (event.data.size > 0) {
                //                 console.log("Data discovered!!")
                //                 webSocketRef.current.send(event.data);
                //             }
                //         };
                //         audioRecorder.start(3000);
                // }
            });
            // webSocketRef.current.addEventListener("stopRecordEvent", () => {
            //     stopRecording()
            // })
        });
    });

    const handleOffer = async (offer) => {
        console.log("Received Offer, Creating Answer");
        peerRef.current = createPeer();

        await peerRef.current.setRemoteDescription(
            new RTCSessionDescription(offer)
        );

        userStream.current.getTracks().forEach((track) => {
            peerRef.current.addTrack(track, userStream.current);
        });

        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);

        webSocketRef.current.send(
            JSON.stringify({ answer: peerRef.current.localDescription })
        );
    };

    const callUser = () => {
        console.log("Calling Other User");
        peerRef.current = createPeer();
        console.log("Step 3")
        userStream.current.getTracks().forEach((track) => {
            peerRef.current.addTrack(track, userStream.current);
        });
    };

    const createPeer = () => {
        console.log("Creating Peer Connection");
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        peer.onnegotiationneeded = handleNegotiationNeeded;
        console.log("Step 1")
        peer.onicecandidate = handleIceCandidateEvent;
        peer.ontrack = handleTrackEvent;

        return peer;
    };

    const handleNegotiationNeeded = async () => {
        console.log("Step 2")
        console.log("Creating Offer");

        try {
            const myOffer = await peerRef.current.createOffer();
            await peerRef.current.setLocalDescription(myOffer);

            webSocketRef.current.send(
                JSON.stringify({ offer: peerRef.current.localDescription })
            );
        } catch (err) {}
    };

    const handleIceCandidateEvent = (e) => {
        console.log("Found Ice Candidate");
        if (e.candidate) {
            console.log(e.candidate.candidate);
            webSocketRef.current.send(
                JSON.stringify({ iceCandidate: e.candidate })
            );
        }
    };

    const handleTrackEvent = (e) => {
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

    function startRecording() {
            dest = audioContext.createMediaStreamDestination();

            localStream.connect(dest);
            peerStream.connect(dest);
            
            const audioRecorder = new MediaRecorder((dest.stream), {
                mimeType: 'audio/webm;codecs=opus'
            });

            console.log("Entered the code!!")
            audioRecorder.ondataavailable = (event) => {
                console.log("Waiting for the ondataavailable event to be triggered!!")
                if (event.data.size > 0) {
                    console.log("Data discovered!!")
                    webSocketRef.current.send(event.data);
                }
            };
            audioRecorder.start(5000);
    }

    function endRecording() {
            webSocketRef.current.send(JSON.stringify({ stopRecoridng: true }));
    }

    function muteMic() {
       console.log("Muting mic!!")
       localAudioStream.getAudioTracks()[0].enabled = false
    }

    function unmuteMic() {
        console.log("Unmuting mic!!")
        localAudioStream.getAudioTracks()[0].enabled = true
    }

    // const GetTasks = async (e) => {
    //     e.preventDefault();
	// 	props.history.push(`/generateTranscript`)
    // };

    const GetResult = async (e) => {
        e.preventDefault();
		props.history.push(`/generateResult`)
    };

    return null

    };

