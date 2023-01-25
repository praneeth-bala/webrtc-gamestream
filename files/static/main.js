// todo: deprecate
const iceConfig = {
    iceServers: [{
        urls: [
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
        ],
    }],
    iceCandidatePoolSize: 10,
};

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

const preset = {
    balanced: {
        displayMediaOption: displayMediaOptions.v720p30,
        rtpPeerConnectionOption: rtpPeerConnectionOptions.stunGoogle,
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

const LaplaceVar = {
    ui: {},
};

function avg(arr) {
    return (arr.reduce((a, b) => a + b, 0) / arr.length) | 0
}

function print(s) {
    LaplaceVar.ui.output.innerHTML += s + '\n';
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

function updateRoomUI() {
    LaplaceVar.ui.panel.style.display = 'none';
    LaplaceVar.ui.videoContainer.style.display = 'block';
    LaplaceVar.ui.streamPageUI.style.display = 'block';

    if (LaplaceVar.roomID) {
        const joinUrl = getJoinUrl(LaplaceVar.roomID);
        LaplaceVar.ui.roomText.innerHTML = '<b>RoomID:</b> #' + LaplaceVar.roomID;
        LaplaceVar.ui.joinLinkText.innerHTML = joinUrl;
        LaplaceVar.ui.joinLinkText.href = joinUrl;
    }
}

function initUI() {
    LaplaceVar.ui.btnStream = document.getElementById('btnStream');
    LaplaceVar.ui.btnStartStream = document.getElementById('btnStartStream');
    LaplaceVar.ui.inputRoomID = document.getElementById('inputRoomID');
    LaplaceVar.ui.inputDisplayMediaOption = document.getElementById('inputDisplayMediaOption');
    LaplaceVar.ui.inputRTPPeerConnectionOption = document.getElementById('inputRTPPeerConnectionOption');
    LaplaceVar.ui.joinLinkText = document.getElementById("join-link");
    LaplaceVar.ui.joinForm = document.getElementById('joinForm');
    LaplaceVar.ui.output = document.getElementById('output');
    LaplaceVar.ui.panel = document.getElementById('panel');
    LaplaceVar.ui.roomText = document.getElementById('room-text');
    LaplaceVar.ui.statusNumConn = document.getElementById('statusNumConn');
    LaplaceVar.ui.statusPeers = document.getElementById('statusPeers');
    LaplaceVar.ui.selectOptionPreset = document.getElementById('inputOptionPreset');
    LaplaceVar.ui.streamPageUI = document.getElementById('stream-page-ui');
    LaplaceVar.ui.streamServePageUI = document.getElementById('stream-serve-page-ui');
    LaplaceVar.ui.video = document.getElementById('mainVideo');
    LaplaceVar.ui.videoContainer = document.getElementById('video-container');

    LaplaceVar.ui.joinForm.onsubmit = async e => {
        e.preventDefault();
        LaplaceVar.roomID = LaplaceVar.ui.inputRoomID.value;
        window.history.pushState('', '', getJoinUrl(LaplaceVar.roomID));
        await doJoin(LaplaceVar.roomID);
    };
    LaplaceVar.ui.btnStream.onclick = async () => {
        window.history.pushState('', '', getStreamUrl());
        await doStream();
    };
    LaplaceVar.ui.btnStartStream.onclick = () => {
        LaplaceVar.ui.streamServePageUI.style.display = 'none';
        const mediaOption = JSON.parse(LaplaceVar.ui.inputDisplayMediaOption.value);
        const pcOption = JSON.parse(LaplaceVar.ui.inputRTPPeerConnectionOption.value);
        return startStream(mediaOption, pcOption);
    };

    for (const presetName of Object.keys(preset)) {
        const optionElement = document.createElement('option');
        optionElement.appendChild(document.createTextNode(presetName));
        optionElement.value = presetName;
        LaplaceVar.ui.selectOptionPreset.appendChild(optionElement);
    }
    LaplaceVar.ui.selectOptionPreset.onchange = () => {
        const v = LaplaceVar.ui.selectOptionPreset.value;
        if (preset[v] != null) {
            LaplaceVar.ui.inputDisplayMediaOption.value = JSON.stringify(preset[v].displayMediaOption, null, 1);
            LaplaceVar.ui.inputRTPPeerConnectionOption.value = JSON.stringify(preset[v].rtpPeerConnectionOption, null, 1);
        }
    };
    const defaultPresetValue = Object.keys(preset)[4];
    LaplaceVar.ui.inputDisplayMediaOption.value = JSON.stringify(preset[defaultPresetValue].displayMediaOption, null, 1);
    LaplaceVar.ui.inputRTPPeerConnectionOption.value = JSON.stringify(preset[defaultPresetValue].rtpPeerConnectionOption, null, 1);


    print("Logs:");
    print("[+] Page loaded");
}

function updateStatusUIStream() {
    LaplaceVar.status.peers = Object.keys(LaplaceVar.pcs).map(s => s);
    LaplaceVar.status.numConn = LaplaceVar.status.peers.length;
    LaplaceVar.ui.statusPeers.innerHTML = LaplaceVar.status.peers.map(s => s).join(', ');
    LaplaceVar.ui.statusNumConn.innerHTML = LaplaceVar.status.numConn;
}

function updateStatusUIJoin() {
    LaplaceVar.ui.statusNumConn.innerHTML = LaplaceVar.status.numConn;
    LaplaceVar.ui.statusPeers.innerHTML = LaplaceVar.status.peers.map(s => LaplaceVar.sessionID.endsWith(s) ? s + ' (you)' : s).join(', ');
}

async function newRoom(rID) {
    print("[+] Get room ID: " + rID);
    LaplaceVar.roomID = rID;
    updateRoomUI();
}

async function newSessionStream(sessionID, pcOption) {
    print('[+] New session: ' + sessionID);
    LaplaceVar.pcs[sessionID] = new RTCPeerConnection(pcOption);
    LaplaceVar.pcs[sessionID].onicecandidate = e => {
        print('[+] Debug onicecandidate: ' + JSON.stringify(e.candidate));
        if (!e.candidate) {
            print('[+] Debug onicecandidate: got final candidate!');
            return;
        }
        print('[+] Send addCallerIceCandidate to websocket: ' + JSON.stringify(e.candidate));
        LaplaceVar.socket.emit("data", JSON.stringify({
            Type: "addCallerIceCandidate",
            SessionID: sessionID,
            Value: JSON.stringify(e.candidate),
        }))
    };
    LaplaceVar.pcs[sessionID].oniceconnectionstatechange = () => {
        print('[+] Debug oniceconnectionstatechange ' + LaplaceVar.pcs[sessionID].iceConnectionState);
        if (LaplaceVar.pcs[sessionID].iceConnectionState === 'disconnected') {
            print("[-] Disconnected with a Peer " + sessionID);
            LaplaceVar.pcs[sessionID].close();
            delete LaplaceVar.pcs[sessionID];
            delete LaplaceVar.dataChannels[sessionID];
            delete LaplaceVar.pings[sessionID];
            delete LaplaceVar.pingHistories[sessionID];
            updateStatusUIStream();
        }
    };
    updateStatusUIStream();

    LaplaceVar.mediaStream.getTracks().forEach(track => {
        LaplaceVar.pcs[sessionID].addTrack(track, LaplaceVar.mediaStream);
    });


    print('[+] Creating offer');
    const offer = await LaplaceVar.pcs[sessionID].createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
    });
    await LaplaceVar.pcs[sessionID].setLocalDescription(offer);

    print('[+] Send offer to websocket: ' + JSON.stringify(offer));
    LaplaceVar.socket.emit("data", JSON.stringify({
        Type: "gotOffer",
        SessionID: sessionID,
        Value: JSON.stringify(offer),
    }));
}

async function addCalleeIceCandidate(sessionID, v) {
    print('[+] Debug addCalleeIceCandidate ' + sessionID + ' ' + JSON.stringify(v));
    return LaplaceVar.pcs[sessionID].addIceCandidate(v);
}

async function gotAnswer(sessionID, v) {
    print('[+] Debug gotAnswer ' + sessionID + ' ' + JSON.stringify(v));
    return LaplaceVar.pcs[sessionID].setRemoteDescription(new RTCSessionDescription(v));
}

async function doStream() {
    LaplaceVar.ui.panel.style.display = 'none';
    LaplaceVar.ui.streamServePageUI.style.display = 'block';
}


async function startStream(displayMediaOption, pcOption) {
    LaplaceVar.pcs = {}; // contains RTCPeerConnections
    LaplaceVar.dataChannels = {};
    LaplaceVar.pings = {};
    LaplaceVar.pingHistories = {};
    LaplaceVar.pingIntervals = {};
    LaplaceVar.status = {
        numConn: 0,
        peers: [],
    };

    updateRoomUI();

    print('[+] Initiate media: capture display media');
    try {
        // noinspection JSUnresolvedFunction
        LaplaceVar.mediaStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOption);
    } catch {
        alert('Streaming from this device is not supported. \n\nGoogle reference: getDisplayMedia');
        leaveRoom()
    }
    LaplaceVar.ui.video.srcObject = LaplaceVar.mediaStream;
    LaplaceVar.ui.video.muted = true; // prevent duplicate sound played

    print('[+] Initiate websocket');
    LaplaceVar.socket = io('https://' + window.location.host + '/ws_serve', {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttemps: 10,
        transports: ['websocket'],
        agent: false,
        upgrade: false,
        rejectUnauthorized: false
    });
    LaplaceVar.socket.on("connect", function () {
        print("[+] Connected to websocket");
    });
    LaplaceVar.socket.on("data", async function (e) {
        try {
            const jsonData = JSON.parse(e);
            if (jsonData.Type !== 'beat') {
                print("[+] Received websocket message: " + JSON.stringify(e));
            }
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
}

async function newSessionJoin(sID) {
    print('[+] New session: ' + sID);
    LaplaceVar.sessionID = sID;
    LaplaceVar.pc = new RTCPeerConnection(iceConfig);
    LaplaceVar.pc.onicecandidate = e => {
        print('[+] Debug onicecandidate: ' + JSON.stringify(e.candidate));
        if (!e.candidate) {
            print('[+] Debug onicecandidate: got final candidate!');
            return;
        }
        print('[+] Send addCalleeIceCandidate to websocket: ' + JSON.stringify(e.candidate));
        LaplaceVar.socket.emit("data", JSON.stringify({
            Type: "addCalleeIceCandidate",
            SessionID: LaplaceVar.sessionID,
            Value: JSON.stringify(e.candidate),
        }))
    };
    LaplaceVar.pc.oniceconnectionstatechange = () => {
        print('[+] pc.oniceconnectionstatechange ' + LaplaceVar.pc.iceConnectionState);
        if (LaplaceVar.pc.iceConnectionState === 'disconnected') {
            print("[-] Disconnected with Peer");
            LaplaceVar.pc.close();
            LaplaceVar.pc = null;
        }
    };
    LaplaceVar.pc.ontrack = event => {
        LaplaceVar.mediaStream.addTrack(event.track);
        LaplaceVar.ui.video.srcObject = LaplaceVar.mediaStream;
        try {
            LaplaceVar.ui.video.play();
        } catch { }
    };
}

async function addCallerIceCandidate(sID, v) {
    print('[+] Debug addCallerIceCandidate ' + sID + ' ' + JSON.stringify(v));
    if (LaplaceVar.sessionID !== sID) return;
    return LaplaceVar.pc.addIceCandidate(v);
}

async function gotOffer(sID, v) {
    print('[+] Debug gotOffer ' + sID + ' ' + JSON.stringify(v));
    if (LaplaceVar.sessionID !== sID) return;
    await LaplaceVar.pc.setRemoteDescription(new RTCSessionDescription(v));

    print('[+] Create answer');
    const answer = await LaplaceVar.pc.createAnswer();
    await LaplaceVar.pc.setLocalDescription(answer);

    print('[+] Send answer to websocket: ' + JSON.stringify(answer));
    LaplaceVar.socket.emit("data", JSON.stringify({
        Type: "gotAnswer",
        SessionID: LaplaceVar.sessionID,
        Value: JSON.stringify(answer),
    }))
}

async function doJoin(roomID) {
    if (roomID) {
        LaplaceVar.roomID = roomID;
    } else {
        return alert('roomID is not provided');
    }
    // normalize roomID starting with #
    LaplaceVar.roomID = LaplaceVar.roomID.startsWith('#') ? LaplaceVar.roomID.slice(1) : LaplaceVar.roomID;
    LaplaceVar.status = {
        numConn: 0,
        peers: [],
    };

    updateRoomUI();

    print('[+] Initiate media: set remote source');
    LaplaceVar.mediaStream = new MediaStream();
    LaplaceVar.ui.video.srcObject = LaplaceVar.mediaStream;
    print('[+] Initiate websocket');
    LaplaceVar.socket = io('https://' + window.location.host + '/ws_connect', {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttemps: 10,
        transports: ['websocket'],
        agent: false,
        upgrade: false,
        rejectUnauthorized: false
    });
    LaplaceVar.socket.on("connect", async function () {
        print("[+] Connected to websocket");
    });
    LaplaceVar.socket.on("data", async function (e) {
        try {
            const jsonData = JSON.parse(e);
            if (jsonData.Type !== 'beat') {
                print("[+] Received websocket message: " + JSON.stringify(e));
            }
            if (jsonData.Type === "newSession") {
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
}

function init_controls(){
        function send_kdown(e) {
            e.preventDefault();
            LaplaceVar.socket.emit('chat message', JSON.stringify({ key: 1, code: e.keyCode }));
        }
        function send_kup(e) {
            e.preventDefault();
            LaplaceVar.socket.emit('chat message', JSON.stringify({ key: 0, code: e.keyCode }));
        }
        // document.addEventListener("keydown", send_kdown);
        // document.addEventListener("keyup", send_kup);
        
        function mouseEvent(e) {
            // e = Mouse click event.
            mouse_stamp = e.timeStamp;
            var rect = e.target.getBoundingClientRect();
            mouse_x = (e.clientX - rect.left) / (rect.right - rect.left); //x position within the element.
            mouse_y = (e.clientY - rect.top) / (rect.bottom - rect.top);  //y position within the element.
            moved = true;
        }
        // document.getElementById('mainVideo').onmousemove = mouseEvent;
        // setInterval(() => {if (moved) { LaplaceVar.socket.emit('chat message', JSON.stringify({ X: mouse_x, Y: mouse_y })); }}, 50);
        // setInterval(() => {if (!moved && Date.now()-mouse_stamp>1000) {moved=false;}}, 1000);

        const haveEvents = 'ongamepadconnected' in window;
        const controllers = {};
        const controller_data = {};
    
        function connecthandler(e) {
            addgamepad(e.gamepad);
        }
    
        function addgamepad(gamepad) {
            controllers[gamepad.index] = gamepad;
            controller_data[gamepad.index] = { 'index':gamepad.index, 'axes': { 0: 0, 0: 0, 0: 0, 0: 0 }, 'buttons': { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0 } };
        }
    
        function disconnecthandler(e) {
            removegamepad(e.gamepad);
        }
    
        function removegamepad(gamepad) {
            delete controllers[gamepad.index];
            delete controller_data[gamepad.index];
        }
    
        function updateStatus() {
            if (!haveEvents) {
                scangamepads();
            }
        }
    
        function scangamepads() {
            const gamepads = navigator.getGamepads();
            for (const gamepad of gamepads) {
                if (gamepad) { // Can be null if disconnected during the session
                    if (gamepad.index in controllers) {
                        controllers[gamepad.index] = gamepad;
                        for (let i = 0; i < 4; i++) {
                            controller_data[gamepad.index].axes[i] = gamepad.axes[i];
                        }
                        for (let i = 0; i < 16; i++) {
                            controller_data[gamepad.index].buttons[i] = gamepad.buttons[i].value;
                        }
                    } else {
                        addgamepad(gamepad);
                    }
                }
            }
            if (Object.keys(controller_data).length != 0)
                LaplaceVar.socket.emit('chat message', JSON.stringify(controller_data));
        }
    
        window.addEventListener("gamepadconnected", connecthandler);
        window.addEventListener("gamepaddisconnected", disconnecthandler);
        setInterval(updateStatus, 50);
}

function routeByUrl() {
    const u = new URL(window.location);
    const paramId = u.searchParams.get('id');
    if (paramId && paramId.length > 0) {
        init_controls();
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

var mouse_x = 0.0, mouse_y = 0.0, moved = false, mouse_stamp = 0.0;

initUI();
document.addEventListener('DOMContentLoaded', routeByUrl, false);


