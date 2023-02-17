const express = require('express');
var http = require('https');
var fs = require('fs');
var sio = require('socket.io');
var app = express();
var IO = require('./io.js');

//HTTPS options
var options = {
  key: fs.readFileSync("./cert.key"),
  cert: fs.readFileSync("./cert.crt"),
  requestCert: false,
  rejectUnauthorized: false
}

//Init
IO.init();
var server = http.createServer(options,app);
var io = sio(server);
app.use(express.static('files'))

//Server and client sockets
var s_socket = {}, c_sockets = {};

//IO permissions for each socket
var perms = {};


//Server connection
io.of("/ws_serve").on("connection", (socket) => {
  if (Object.keys(s_socket).length != 0) {
    socket.emit("Error", { Error: "Already a streamer in server" });
    socket.destroy();
  }

  s_socket = socket;

  //Forward webrtc comms to relevant clients
  socket.emit("data", JSON.stringify({ SessionID: "", Type: "newRoom", Value: "1" }));
  socket.on("data", (data) => { c_sockets[JSON.parse(data).SessionID].emit("data", data); });

  //Setup IO devices after approval or request
  socket.on("auth", (data) => {
    let SID = JSON.parse(data).SessionID;

    //Store permissions
    perms[SID] = JSON.parse(data);

    //Allotted controller indices
    perms[SID].controllerIndices = []
    for (let i = 0; i < JSON.parse(data).Controllers; i++) {

      //Max 4 controllers allowed per Host
      if (IO.controllerCount > 3) break;
      let newIndex = IO.makeController();
      perms[SID].controllerIndices.push(newIndex);
    }

    //Setup keyboard if acquired
    c_sockets[SID].on('kb', msg => {
      var jmsg = JSON.parse(msg);
      if (perms[SID].Keyboard == 1)
        IO.press(jmsg.key, jmsg.code);
    });

    //Setup mouse if acquired
    c_sockets[SID].on('ms', msg => {
      var jmsg = JSON.parse(msg);
      if (perms[SID].Mouse == 1)
        IO.mous(jmsg);
    });

    //Setup controllers if acquired
    c_sockets[SID].on('ct', msg => {
      var jmsg = JSON.parse(msg);
      IO.cont(jmsg, perms[SID].controllerIndices);
    });

    //Signal start of session to both server and client
    c_sockets[SID].emit("data", JSON.stringify({ SessionID: SID, Type: "newSession", Value: "" }));
    s_socket.emit("data", JSON.stringify({ SessionID: SID, Type: "newSession", Value: "" }));

  });

  //Reset server state on host disconnection
  socket.on("disconnect", () => {
    s_socket = {};
    perms = {};
    for (let i = 0; i < Object.keys(c_sockets); i++) {
      try {
        c_sockets[Object.keys(c_sockets)[i]].destroy();
        IO.deleteControllers(perms[Object.keys(c_sockets)[i]].controllerIndices);
      }
      catch {
      }
    }
    c_sockets = {};
  });
});

//Client socket connections
io.of("/ws_connect").on("connection", (socket) => {

  //Make new session
  var newSID = newSessionID();

  //Store the socket
  c_sockets[newSID] = socket;

  //Get io device requests
  socket.on("auth", (data) => { data = JSON.parse(data); data.SessionID = newSID; s_socket.emit("auth", JSON.stringify(data)) });

  //Forward webrtc comms
  socket.on("data", (data) => { s_socket.emit("data", data); });

  //Disconnect controllers on exit
  socket.on("disconnect", () => {
    try {
      IO.deleteControllers(perms[newSID].controllerIndices);
    }
    catch {
    }
    perms[newSID] = {};
  });
});

//Home
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/files/main.html');
});

//Start the server
server.listen(443, function () {
  console.log('Server up and running at port %s', 443);
});


//Create a new session (Naive)
let session = 0;
function newSessionID() {
  session += 1;
  return session.toString();
}
