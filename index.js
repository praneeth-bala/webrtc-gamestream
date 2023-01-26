const express = require('express');
var https = require('https');
var fs = require('fs');
var sio = require('socket.io');
var app = express();
var IO = require('./io.js');

var options = {
  key: fs.readFileSync("./cert.key"),
  cert: fs.readFileSync("./cert.crt"),
  requestCert: false,
  rejectUnauthorized: false
}

IO.init();
var server = https.createServer(options, app);
var io = sio(server);
app.use(express.static('files'))
var s_socket={}, c_sockets={};
var perms = {};


io.of("/ws_serve").on("connection", (socket) => {
  s_socket = socket;
  socket.emit("data", JSON.stringify({ SessionID: "", Type: "newRoom", Value: "1" }));
  socket.on("auth", (data)=>{
    let SID = JSON.parse(data).SessionID;
    perms[SID]=JSON.parse(data);
    for(let i=0;i<JSON.parse(data).Controllers;i++){
      if(IO.controllerCount>3) break;
      IO.makeController();
    }
    c_sockets[SID].on('kb', msg => {
      var jmsg = JSON.parse(msg);
      if(perms[SID].Keyboard==1)
      IO.press(jmsg.key, jmsg.code);
    });
    c_sockets[SID].on('ms', msg => {
      var jmsg = JSON.parse(msg);
      if(perms[SID].Mouse==1)
      IO.mous(jmsg);
    });
    c_sockets[SID].on('ct', msg => {
      var jmsg = JSON.parse(msg);
      IO.cont(jmsg,perms[SID].Controllers);
    });
    c_sockets[SID].emit("data", JSON.stringify({ SessionID: SID, Type: "newSession", Value: "" }));
    s_socket.emit("data", JSON.stringify({ SessionID: SID, Type: "newSession", Value: "" }));
  });
  socket.on("data", (data) => {c_sockets[JSON.parse(data).SessionID].emit("data", data); });
  socket.on("disconnect", () => {
    s_socket = {};
  });
});


io.of("/ws_connect").on("connection", (socket) => {
  var newSID=newSessionID();
  c_sockets[newSID] = socket;
  socket.on("auth", (data)=>{data = JSON.parse(data); data.SessionID=newSID; s_socket.emit("auth",JSON.stringify(data))});
  socket.on("data", (data) => { s_socket.emit("data", data); });
  // socket.on("disconnect", () => {
  // });
});

app.get('/', (req, res) => {
  if (1||"id" in req.query || s_socket_id == -1) {
    res.sendFile(__dirname + '/files/main.html');
  }
  else {
    res.send("Already running!");
  }
});


server.listen(443, function () {
  console.log('Server up and running at port %s', 443);
});

let session=0;
function newSessionID(){
  session+=1;
  return session.toString();
}
