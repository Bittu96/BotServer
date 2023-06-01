function botConnect(stream) {
	document.getElementById('peers').style.display = 'block'
	document.getElementById('chat').style.display = 'flex'
	document.getElementById('noperm').style.display = 'none'
	let pc = new RTCPeerConnection({
		iceServers: [{
				'urls': 'stun:turn.videochat:3478',
			},
			{
				'urls': 'turn:turn.videochat:3478',
				'username': 'akhil',
				'credential': 'akhil',
			}
		]
	})

	// let pc = new RTCPeerConnection({
	// 	iceServers: [{
	// 		 'urls': [ "stun:bn-turn1.xirsys.com" ]},
	// 		  {
	// 			    'username': "jcuvNqhQdQWR1JbE6LdovEENejXg0c-zQWXWtOXd8KFaJfOEJz9S8Lb1LcMpz2coAAAAAGQMmg5TYWl0ZWph",
	// 			    'credential': "f4b03976-c01e-11ed-9240-0242ac140004",
	// 			    'urls': 
	// 				[ 
	// 				    "turn:bn-turn1.xirsys.com:80?transport=udp",
	// 					"turn:bn-turn1.xirsys.com:3478?transport=udp",
	// 					"turn:bn-turn1.xirsys.com:80?transport=tcp",
	// 					"turn:bn-turn1.xirsys.com:3478?transport=tcp",
	// 					"turns:bn-turn1.xirsys.com:443?transport=tcp",
	// 					"turns:bn-turn1.xirsys.com:5349?transport=tcp"
	// 			]
	// 			}]
	// })

	//APPENDING THE VIDEO AS SOON AS A TRACK IS RECEIVED FROM A PEER
	pc.ontrack = function (event) {
		if (botConnected) {
			return
		}
		if (event.track.kind === 'audio') {
			console.log("Only audio found, so returning!!")
			return
		}

		console.log("Got bot video on track!!")

		col = document.createElement("div")
		col.className = "column is-6 peer bot"
		
		let el = document.createElement("div")
		el.setAttribute("controls", "true")
		el.setAttribute("autoplay", "true")
		el.setAttribute("playsinline", "true")
		el.style.height = "480px"
		el.style.width = "640px"
		el.style.backgroundImage = "url('https://d2cbg94ubxgsnp.cloudfront.net/Pictures/2000x1125/9/9/3/512993_shutterstock_715962319converted_920340.png')"
		el.style.backgroundSize = "cover"
		el.style.margin = "10px"
		el.style.fontSize = "6px"

		let h1 = document.createElement("h1")
		let botId = `Bot id : ${BotUUID} => ${event}`
		const botid = document.createTextNode(botId);
		h1.appendChild(botid);	

		el.appendChild(h1)
		col.appendChild(el)
		document.getElementById('noone').style.display = 'none'
		document.getElementById('nocon').style.display = 'none'
		document.getElementById('videos').appendChild(col)

		event.streams[0].onremovetrack = ({
			track
		}) => {
			if (el.parentNode) {
				el.parentNode.remove()
			}
			if (document.getElementById('videos').childElementCount <= 3) {
				document.getElementById('noone').style.display = 'grid'
				document.getElementById('noonein').style.display = 'grid'
			}
		}
		botConnected = true
	}

	try {
		stream.getTracks().forEach(track => pc.addTrack(track, stream))
		return
	} catch (error) {
		console.log("bot stream error: ",error)
		stream = new MediaStream()
	}
	console.log("bot stream: ",stream)
	stream.getTracks().forEach(track => pc.addTrack(track, stream))

	console.log("bot Web socket address is : ",BotWebsocketAddr)
	let ws = new WebSocket(BotWebsocketAddr)
	
	pc.onicecandidate = e => {
		if (!e.candidate) {
			return
		}

		console.log("Printing the bot candidate : ", e.candidate);

		ws.send(JSON.stringify({
			event: 'candidate',
			data: JSON.stringify(e.candidate)
		}))
	}

	ws.addEventListener('error', function (event) {
		console.log('error: ', event)
	})

	
	ws.onclose = function (evt) {
		console.log("bot websocket has closed")
		pc.close();
		pc = null;
		pr = document.getElementById('videos')
		while (pr.childElementCount > 3) {
			pr.lastChild.remove()
		}
		document.getElementById('noone').style.display = 'none'
		document.getElementById('nocon').style.display = 'flex'
		setTimeout(function () {
			connect(stream);
		}, 1000);
	}

	ws.onmessage = function (evt) {
		let msg = JSON.parse(evt.data);

        console.log("Printing bot message : ", msg);

		if (!msg) {
			return console.log('failed to parse bot msg')
		}

		switch (msg.event) {
			case 'offer':
				let offer = JSON.parse(msg.data)
				console.log("The message has an bot offer!!")
				if (!offer) {
					return console.log('failed to parse bot answer')
				}
				pc.setRemoteDescription(offer)
				pc.createAnswer().then(answer => {
					pc.setLocalDescription(answer)
					ws.send(JSON.stringify({
						event: 'answer',
						data: JSON.stringify(answer)
					}))
				})
				return

			case 'candidate':
				let candidate = JSON.parse(msg.data)
				console.log("The message has a bot candidate!!")
				if (!candidate) {
					return console.log('failed to parse bot candidate')
				}

				pc.addIceCandidate(candidate)
		}
	}

	ws.onerror = function (evt) {
		console.log("bot error: " + evt.data)
	}
}