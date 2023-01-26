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

var server = https.createServer(options, app);
var io = sio(server);
app.use(express.static('files'))
var s_socket_id = -1, c_socket_id = {};


io.of("/ws_serve").on("connection", (socket) => {
  s_socket_id = socket.id;
  socket.emit("data", JSON.stringify({ SessionID: "", Type: "newRoom", Value: "1" }));
  socket.on("data", (data) => {io.of('/ws_connect').to(c_socket_id[JSON.parse(data).SessionID]).emit("data", data); });
  socket.on("disconnect", () => {
    s_socket_id = -1;
  });
});


io.of("/ws_connect").on("connection", (socket) => {
  var newSID=newSessionID();
  c_socket_id[newSID] = socket.id;
  socket.emit("data", JSON.stringify({ SessionID: newSID, Type: "newSession", Value: "" }));
  io.of('/ws_serve').to(s_socket_id).emit("data", JSON.stringify({ SessionID: newSID, Type: "newSession", Value: "" }));
  console.log(newSID);
  socket.on("data", (data) => { io.of('/ws_serve').to(s_socket_id).emit("data", data); });
  socket.on('kb', msg => {
    var jmsg = JSON.parse(msg);
    IO.press(jmsg.key, jmsg.code);
  });
  socket.on('ms', msg => {
    var jmsg = JSON.parse(msg);
    IO.mous(jmsg);
  });
  socket.on('ct', msg => {
    var jmsg = JSON.parse(msg);
    IO.cont(jmsg);
  });
  // socket.on("disconnect", () => {
  // });
});

app.get('/', (req, res) => {
  if ("id" in req.query || s_socket_id == -1) {
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
