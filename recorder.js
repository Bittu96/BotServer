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