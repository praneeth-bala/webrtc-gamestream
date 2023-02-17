//ICE configs
const iceConfig = {
    iceServers: [{
        urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
        ],
    }],
    iceCandidatePoolSize: 10,
};

//Video Presets
const displayMediaOptions = {
    noConstraint: {
        video: true,
        audio: true,
    },
    v720p30: {
        video: {
            height: 720,
            frameRate: 30,
        },
        audio: true,
    },
    v720p60: {
        video: {
            height: 720,
            frameRate: 60,
        },
        audio: true,
    },
};

//WebRTC presets
const rtpPeerConnectionOptions = {
    stunGoogle: {
        iceServers: [{
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        }],
        iceCandidatePoolSize: 10,
    },
    noStun: {
        iceServers: [],
    }
};

//Setup presets
const preset = {
    balanced: {
        displayMediaOption: displayMediaOptions.v720p30,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.noStun,
    },
    performance: {
        displayMediaOption: displayMediaOptions.v720p60,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.stunGoogle,
    },
    highQuality: {
        displayMediaOption: displayMediaOptions.noConstraint,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.stunGoogle,
    },
    balancedLanOnly: {
        displayMediaOption: displayMediaOptions.v720p30,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.noStun,
    },
    performanceLanOnly: {
        displayMediaOption: displayMediaOptions.v720p60,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.noStun,
    },
    highQualityLanOnly: {
        displayMediaOption: displayMediaOptions.noConstraint,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.noStun,
    },
};

//Main Object
const BPGCRemote = {
    ui: {},
};

//Print to custom console for debugging
function print(s) {
    BPGCRemote.ui.output.innerHTML += s + '\n';
}

function getBaseUrl() {
    return `${window.location.protocol}//${window.location.host}`
}

function getStreamUrl() {
    return `${getBaseUrl()}/?stream=1`;
}

function getJoinUrl(roomID) {
    return `${getBaseUrl()}/?id=${roomID}`;
}

//Switch from setup page to video page
function updateRoomUI() {
    BPGCRemote.ui.panel.style.display = 'none';
    BPGCRemote.ui.videoContainer.style.display = 'block';
    BPGCRemote.ui.streamPageUI.style.display = 'block';

    if (BPGCRemote.roomID) {
        BPGCRemote.ui.roomText.innerHTML = '<b>RoomID:</b> #' + BPGCRemote.roomID;
    }
}

//Main UI initialization
function initUI() {
    BPGCRemote.ui.btnStream = document.getElementById('btnStream');
    BPGCRemote.ui.btnStartStream = document.getElementById('btnStartStream');
    BPGCRemote.ui.inputRoomID = document.getElementById('inputRoomID');
    BPGCRemote.ui.inputDisplayMediaOption = document.getElementById('inputDisplayMediaOption');
    BPGCRemote.ui.inputRTPPeerConnectionOption = document.getElementById('inputRTPPeerConnectionOption');
    BPGCRemote.ui.joinBtn = document.getElementById('doJoin');
    BPGCRemote.ui.output = document.getElementById('output');
    BPGCRemote.ui.panel = document.getElementById('panel');
    BPGCRemote.ui.roomText = document.getElementById('room-text');
    BPGCRemote.ui.statusNumConn = document.getElementById('statusNumConn');
    BPGCRemote.ui.statusPeers = document.getElementById('statusPeers');
    BPGCRemote.ui.selectOptionPreset = document.getElementById('inputOptionPreset');
    BPGCRemote.ui.streamPageUI = document.getElementById('stream-page-ui');
    BPGCRemote.ui.streamServePageUI = document.getElementById('stream-serve-page-ui');
    BPGCRemote.ui.video = document.getElementById('mainVideo');
    BPGCRemote.ui.videoContainer = document.getElementById('video-container');
    BPGCRemote.ui.label1 = document.getElementById('label1');
    BPGCRemote.ui.label2 = document.getElementById('label2');

    //Join as viewer
    BPGCRemote.ui.joinBtn.onclick = async e => {
        BPGCRemote.ui.panel.style.display = 'none';
        BPGCRemote.ui.streamServePageUI.style.display = 'block';
        BPGCRemote.ui.selectOptionPreset.style.display = 'none';
        BPGCRemote.ui.inputRTPPeerConnectionOption.style.display = 'none';
        BPGCRemote.ui.label1.innerHTML = "";
        BPGCRemote.ui.label2.innerHTML = "";
        BPGCRemote.ui.btnStartStream.innerHTML = "Join Stream";

        //Available IO devices
        BPGCRemote.ui.inputDisplayMediaOption.value = JSON.stringify({ Keyboard: 0, Mouse: 0, Controllers: 0 }, null, 1);

        //Setup websocket
        print('[+] Initiate websocket');
        BPGCRemote.socket = io('https://' + window.location.host + '/ws_connect', {
            reconnectionDelay: 1000,
            reconnection: true,
            reconnectionAttemps: 10,
            transports: ['websocket'],
            agent: false,
            upgrade: false,
            rejectUnauthorized: false
        });

        //Connection
        BPGCRemote.socket.on("connect", async function () {
            print("[+] Connected to websocket");
        });

        //Socket downstream
        BPGCRemote.socket.on("data", async function (e) {
            try {
                const jsonData = JSON.parse(e);
                //Log
                print("[+] Received websocket message: " + JSON.stringify(e));

                //If auth succesful, start session
                if (jsonData.Type === "newSession") {
                    await doJoin('1');

                    //Setup respective IO polling
                    if (JSON.parse(BPGCRemote.ui.inputDisplayMediaOption.value).Controllers > 0) init_controllers();
                    if (JSON.parse(BPGCRemote.ui.inputDisplayMediaOption.value).Keyboard > 0) init_kb();
                    if (JSON.parse(BPGCRemote.ui.inputDisplayMediaOption.value).Mouse > 0) init_mouse();

                    await newSessionJoin(jsonData.SessionID);
                } else if (jsonData.Type === "addCallerIceCandidate") {
                    await addCallerIceCandidate(jsonData.SessionID, JSON.parse(jsonData.Value));
                } else if (jsonData.Type === "gotOffer") {
                    await gotOffer(jsonData.SessionID, JSON.parse(jsonData.Value));
                } else if (jsonData.Type === 'roomNotFound') {
                    alert('Room not found');
                    leaveRoom();
                } else if (jsonData.Type === 'roomClosed') {
                    alert('Room closed');
                }
            } catch (e) {
                print("[!] ERROR: " + e);
                console.error(e)
            }
        });
    };

    //Join as streamer
    BPGCRemote.ui.btnStream.onclick = async () => {
        window.history.pushState('', '', getStreamUrl());
        await doStream();
    };

    //Confirm stream settings/ Join settings
    BPGCRemote.ui.btnStartStream.onclick = () => {
        BPGCRemote.ui.streamServePageUI.style.display = 'none';
        const mediaOption = JSON.parse(BPGCRemote.ui.inputDisplayMediaOption.value);
        const pcOption = JSON.parse(BPGCRemote.ui.inputRTPPeerConnectionOption.value);

        //If viewer
        if (Object.keys(mediaOption)[0] == "Keyboard") {
            //Ask for granting permissions
            BPGCRemote.socket.emit("auth", BPGCRemote.ui.inputDisplayMediaOption.value);
        }
        else return startStream(mediaOption, pcOption);
    };

    //Setup presets UI
    for (const presetName of Object.keys(preset)) {
        const optionElement = document.createElement('option');
        optionElement.appendChild(document.createTextNode(presetName));
        optionElement.value = presetName;
        BPGCRemote.ui.selectOptionPreset.appendChild(optionElement);
    }
    BPGCRemote.ui.selectOptionPreset.onchange = () => {
        const v = BPGCRemote.ui.selectOptionPreset.value;
        if (preset[v] != null) {
            BPGCRemote.ui.inputDisplayMediaOption.value = JSON.stringify(preset[v].displayMediaOption, null, 1);
            BPGCRemote.ui.inputRTPPeerConnectionOption.value = JSON.stringify(preset[v].rtpPeerConnectionOption, null, 1);
        }
    };
    const defaultPresetValue = Object.keys(preset)[4];
    BPGCRemote.ui.inputDisplayMediaOption.value = JSON.stringify(preset[defaultPresetValue].displayMediaOption, null, 1);
    BPGCRemote.ui.inputRTPPeerConnectionOption.value = JSON.stringify(preset[defaultPresetValue].rtpPeerConnectionOption, null, 1);


    print("Logs:");
    print("[+] Page loaded");
}

function updateStatusUIStream() {
    BPGCRemote.status.peers = Object.keys(BPGCRemote.pcs).map(s => s);
    BPGCRemote.status.numConn = BPGCRemote.status.peers.length;
    BPGCRemote.ui.statusPeers.innerHTML = BPGCRemote.status.peers.map(s => s).join(', ');
    BPGCRemote.ui.statusNumConn.innerHTML = BPGCRemote.status.numConn;
}

function updateStatusUIJoin() {
    BPGCRemote.ui.statusNumConn.innerHTML = BPGCRemote.status.numConn;
    BPGCRemote.ui.statusPeers.innerHTML = BPGCRemote.status.peers.map(s => BPGCRemote.sessionID.endsWith(s) ? s + ' (you)' : s).join(', ');
}

async function newRoom(rID) {
    print("[+] Get room ID: " + rID);
    BPGCRemote.roomID = rID;
    updateRoomUI();
}

//Called on server for each new client
async function newSessionStream(sessionID, pcOption) {
    print('[+] New session: ' + sessionID);
    BPGCRemote.pcs[sessionID] = new RTCPeerConnection(pcOption);
    BPGCRemote.pcs[sessionID].onicecandidate = e => {
        print('[+] Debug onicecandidate: ' + JSON.stringify(e.candidate));
        if (!e.candidate) {
            print('[+] Debug onicecandidate: got final candidate!');
            return;
        }
        print('[+] Send addCallerIceCandidate to websocket: ' + JSON.stringify(e.candidate));
        BPGCRemote.socket.emit("data", JSON.stringify({
            Type: "addCallerIceCandidate",
            SessionID: sessionID,
            Value: JSON.stringify(e.candidate),
        }))
    };
    BPGCRemote.pcs[sessionID].oniceconnectionstatechange = () => {
        print('[+] Debug oniceconnectionstatechange ' + BPGCRemote.pcs[sessionID].iceConnectionState);
        if (BPGCRemote.pcs[sessionID].iceConnectionState === 'disconnected') {
            print("[-] Disconnected with a Peer " + sessionID);
            BPGCRemote.pcs[sessionID].close();
            delete BPGCRemote.pcs[sessionID];
            delete BPGCRemote.dataChannels[sessionID];
            delete BPGCRemote.pings[sessionID];
            delete BPGCRemote.pingHistories[sessionID];
            updateStatusUIStream();
        }
    };
    updateStatusUIStream();

    BPGCRemote.mediaStream.getTracks().forEach(track => {
        BPGCRemote.pcs[sessionID].addTrack(track, BPGCRemote.mediaStream);
    });


    print('[+] Creating offer');
    var offer = await BPGCRemote.pcs[sessionID].createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
    });
    await BPGCRemote.pcs[sessionID].setLocalDescription(offer);

    print('[+] Send offer to websocket: ' + JSON.stringify(offer));
    BPGCRemote.socket.emit("data", JSON.stringify({
        Type: "gotOffer",
        SessionID: sessionID,
        Value: JSON.stringify(offer),
    }));
}

async function addCalleeIceCandidate(sessionID, v) {
    print('[+] Debug addCalleeIceCandidate ' + sessionID + ' ' + JSON.stringify(v));
    return BPGCRemote.pcs[sessionID].addIceCandidate(v);
}

async function gotAnswer(sessionID, v) {
    print('[+] Debug gotAnswer ' + sessionID + ' ' + JSON.stringify(v));
    return BPGCRemote.pcs[sessionID].setRemoteDescription(new RTCSessionDescription(v));
}

async function doStream() {
    BPGCRemote.ui.panel.style.display = 'none';
    BPGCRemote.ui.streamServePageUI.style.display = 'block';
}


//Start streaming
async function startStream(displayMediaOption, pcOption) {
    BPGCRemote.pcs = {}; // contains RTCPeerConnections
    BPGCRemote.dataChannels = {};
    BPGCRemote.pings = {};
    BPGCRemote.pingHistories = {};
    BPGCRemote.pingIntervals = {};
    BPGCRemote.status = {
        numConn: 0,
        peers: [],
    };

    updateRoomUI();

    print('[+] Initiate media: capture display media');
    try {
        // noinspection JSUnresolvedFunction
        BPGCRemote.mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOption);
    } catch {
        alert('Streaming from this device is not supported. \n\nGoogle reference: getDisplayMedia');
        leaveRoom()
    }
    BPGCRemote.ui.video.srcObject = BPGCRemote.mediaStream;
    BPGCRemote.ui.video.muted = true; // prevent duplicate sound played

    print('[+] Initiate websocket');
    BPGCRemote.socket = io('https://' + window.location.host + '/ws_serve', {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttemps: 10,
        transports: ['websocket'],
        agent: false,
        upgrade: false,
        rejectUnauthorized: false
    });
    BPGCRemote.socket.on("connect", function () {
        print("[+] Connected to websocket");
    });
    BPGCRemote.socket.on("data", async function (e) {
        try {
            const jsonData = JSON.parse(e);
            print("[+] Received websocket message: " + JSON.stringify(e));
            if (jsonData.Type === "newRoom") {
                await newRoom(jsonData.Value);
            } else if (jsonData.Type === "newSession") {
                await newSessionStream(jsonData.SessionID, pcOption);
            } else if (jsonData.Type === "addCalleeIceCandidate") {
                await addCalleeIceCandidate(jsonData.SessionID, JSON.parse(jsonData.Value));
            } else if (jsonData.Type === "gotAnswer") {
                await gotAnswer(jsonData.SessionID, JSON.parse(jsonData.Value));
            }
        } catch (e) {
            print("[!] ERROR: " + e);
            console.error(e);
        }
    });

    //Grant requested permission for viewers
    BPGCRemote.socket.on("auth", function (e) { console.log(JSON.parse(e)); BPGCRemote.socket.emit("auth", e) });
}


//Called on viewer side to start stream
async function newSessionJoin(sID) {
    print('[+] New session: ' + sID);
    BPGCRemote.sessionID = sID;
    BPGCRemote.pc = new RTCPeerConnection(iceConfig);
    BPGCRemote.pc.onicecandidate = e => {
        print('[+] Debug onicecandidate: ' + JSON.stringify(e.candidate));
        if (!e.candidate) {
            print('[+] Debug onicecandidate: got final candidate!');
            return;
        }
        print('[+] Send addCalleeIceCandidate to websocket: ' + JSON.stringify(e.candidate));
        BPGCRemote.socket.emit("data", JSON.stringify({
            Type: "addCalleeIceCandidate",
            SessionID: BPGCRemote.sessionID,
            Value: JSON.stringify(e.candidate),
        }))
    };
    BPGCRemote.pc.oniceconnectionstatechange = () => {
        print('[+] pc.oniceconnectionstatechange ' + BPGCRemote.pc.iceConnectionState);
        if (BPGCRemote.pc.iceConnectionState === 'disconnected') {
            print("[-] Disconnected with Peer");
            BPGCRemote.pc.close();
            BPGCRemote.pc = null;
        }
    };
    BPGCRemote.pc.ontrack = event => {
        BPGCRemote.mediaStream.addTrack(event.track);
        BPGCRemote.ui.video.srcObject = BPGCRemote.mediaStream;
        try {
            BPGCRemote.ui.video.play();
        } catch { }
    };
}

async function addCallerIceCandidate(sID, v) {
    print('[+] Debug addCallerIceCandidate ' + sID + ' ' + JSON.stringify(v));
    if (BPGCRemote.sessionID !== sID) return;
    return BPGCRemote.pc.addIceCandidate(v);
}

async function gotOffer(sID, v) {
    print('[+] Debug gotOffer ' + sID + ' ' + JSON.stringify(v));
    if (BPGCRemote.sessionID !== sID) return;
    await BPGCRemote.pc.setRemoteDescription(new RTCSessionDescription(v));

    print('[+] Create answer');
    var answer = await BPGCRemote.pc.createAnswer();
    // var arr = answer.sdp.split('\r\n');
    // arr.forEach((str, i) => {
    //     if (/^a=fmtp:\d*/.test(str)) {
    //       arr[i] = str + ';x-google-max-bitrate=15000;x-google-min-bitrate=0;x-google-start-bitrate=10000';
    //     } else if (/^a=mid:(1|video)/.test(str)) {
    //       arr[i] += '\r\nb=AS:15000';
    //     }
    // });
    // answer = new RTCSessionDescription({
    //     type: 'answer',
    //     sdp: arr.join('\r\n'),
    // })
    await BPGCRemote.pc.setLocalDescription(answer);

    print('[+] Send answer to websocket: ' + JSON.stringify(answer));
    BPGCRemote.socket.emit("data", JSON.stringify({
        Type: "gotAnswer",
        SessionID: BPGCRemote.sessionID,
        Value: JSON.stringify(answer),
    }))
}


//Join as viewer
async function doJoin(roomID) {
    BPGCRemote.roomID = roomID;
    // normalize roomID starting with #
    BPGCRemote.roomID = BPGCRemote.roomID.startsWith('#') ? BPGCRemote.roomID.slice(1) : BPGCRemote.roomID;
    BPGCRemote.status = {
        numConn: 0,
        peers: [],
    };

    updateRoomUI();

    print('[+] Initiate media: set remote source');
    BPGCRemote.mediaStream = new MediaStream();
    BPGCRemote.ui.video.srcObject = BPGCRemote.mediaStream;
}

//Mouse polling
function init_mouse() {

    //Send on socket
    function mouseSendEvent() {
        BPGCRemote.socket.emit('ms', JSON.stringify({ X: BPGCRemote.mouse_x, Y: BPGCRemote.mouse_y, leftClick: BPGCRemote.lclick, rightClick: BPGCRemote.rclick, scroll: BPGCRemote.mscroll }));
    }

    //Mouse move
    function mouseMoveEvent(e) {
        // e = Mouse click event.
        var rect = e.target.getBoundingClientRect();
        BPGCRemote.mouse_x = (e.clientX - rect.left) / (rect.right - rect.left); //x position within the element.
        BPGCRemote.mouse_y = (e.clientY - rect.top) / (rect.bottom - rect.top);  //y position within the element.
        BPGCRemote.mouse_stamp = e.timeStamp;
        BPGCRemote.moved = true;
    }

    //Scroll
    function mouseScrollEvent(e) {
        e.preventDefault();
        BPGCRemote.mscroll = e.deltaY;
        BPGCRemote.mouse_stamp = e.timeStamp;
        BPGCRemote.moved = true;
    }

    //Click
    function mouseClickEvent(press, e) {
        e.preventDefault();
        if (e.button == 0)
            BPGCRemote.lclick = press;
        else
            BPGCRemote.rclick = press;
        mouseSendEvent();
        BPGCRemote.mscroll = 0;
    }

    //Setup listeners
    document.getElementById('mainVideo').onmousemove = mouseMoveEvent;
    document.getElementById('mainVideo').onmousedown = (e) => { mouseClickEvent(1, e) };
    document.getElementById('mainVideo').onmouseup = (e) => { mouseClickEvent(0, e) };
    document.getElementById('mainVideo').addEventListener('wheel', mouseScrollEvent, { passive: false });

    //Intervals to check for idle state and send data
    setInterval(() => { if (BPGCRemote.moved) { mouseSendEvent(); BPGCRemote.mscroll = 0; } }, 50);
    setInterval(() => { if (BPGCRemote.moved && Date.now() - BPGCRemote.mouse_stamp > 1000) { BPGCRemote.moved = false; } }, 1000);
}


//Setup keyboard
function init_kb() {
    //Press
    function send_kdown(e) {
        e.preventDefault();
        BPGCRemote.socket.emit('kb', JSON.stringify({ key: 1, code: e.keyCode }));
    }
    //Release
    function send_kup(e) {
        e.preventDefault();
        BPGCRemote.socket.emit('kb', JSON.stringify({ key: 0, code: e.keyCode }));
    }
    //Listeners
    document.addEventListener("keydown", send_kdown);
    document.addEventListener("keyup", send_kup);
}

//Setup controllers
function init_controllers() {
    BPGCRemote.haveContEvents = 'ongamepadconnected' in window;
    BPGCRemote.controllers = {};
    BPGCRemote.controller_data = {};

    function connecthandler(e) {
        addgamepad(e.gamepad);
    }

    function addgamepad(gamepad) {
        BPGCRemote.controllers[gamepad.index] = gamepad;
        BPGCRemote.controller_data[gamepad.index] = { 'index': gamepad.index, 'axes': { 0: 0, 0: 0, 0: 0, 0: 0 }, 'buttons': { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 } };
    }

    function disconnecthandler(e) {
        removegamepad(e.gamepad);
    }

    function removegamepad(gamepad) {
        delete BPGCRemote.controllers[gamepad.index];
        delete BPGCRemote.controller_data[gamepad.index];
    }

    function updateStatus() {
        if (!BPGCRemote.haveContEvents) {
            scangamepads();
        }
    }

    function scangamepads() {
        const gamepads = navigator.getGamepads();
        for (const gamepad of gamepads) {
            if (gamepad) { // Can be null if disconnected during the session
                if (gamepad.index in BPGCRemote.controllers) {
                    BPGCRemote.controllers[gamepad.index] = gamepad;
                    for (let i = 0; i < 4; i++) {
                        BPGCRemote.controller_data[gamepad.index].axes[i] = gamepad.axes[i];
                    }
                    for (let i = 0; i < 16; i++) {
                        BPGCRemote.controller_data[gamepad.index].buttons[i] = gamepad.buttons[i].value;
                    }
                } else {
                    addgamepad(gamepad);
                }
            }
        }
        //Send data to server
        if (Object.keys(BPGCRemote.controller_data).length != 0)
            BPGCRemote.socket.emit('ct', JSON.stringify(BPGCRemote.controller_data));
    }

    window.addEventListener("gamepadconnected", connecthandler);
    window.addEventListener("gamepaddisconnected", disconnecthandler);

    //Setup polling
    setInterval(updateStatus, 50);
}

// function init_controls() {
//     // init_mouse();
//     // init_kb();
//     // init_controllers();
// }

function routeByUrl() {
    const u = new URL(window.location);
    const paramId = u.searchParams.get('id');
    if (paramId && paramId.length > 0) {
        return doJoin(paramId);
    }
    const paramStream = u.searchParams.get('stream');
    if (paramStream && paramStream.length > 0) {
        return doStream();
    }
}

function leaveRoom() {
    window.location.href = getBaseUrl();
}

//IO state variables
BPGCRemote.mouse_x = 0.0;
BPGCRemote.mouse_y = 0.0;
BPGCRemote.moved = false;
BPGCRemote.mouse_stamp = 0.0;
BPGCRemote.lclick = 0;
BPGCRemote.rclick = 0;
BPGCRemote.mscroll = 0;

initUI();
// document.addEventListener('DOMContentLoaded', routeByUrl, false);

function goFullscreen(id) {
    var element = document.getElementById(id);
    if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullScreen) {
        element.webkitRequestFullScreen();
    }
}