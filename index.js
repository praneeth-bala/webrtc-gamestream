const express = require('express');
const { mouse, Point, Button, keyboard, Key } = require("@nut-tree/nut-js");
var https = require('https');
var fs = require('fs');
var sio = require('socket.io');
const ViGEmClient = require('vigemclient');
var app = express();
let client = new ViGEmClient();
client.connect();

keyboard.config.autoDelayMs = 0;
mouse.config.autoDelayMs = 0;
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
    press(jmsg.key, jmsg.code);
  });
  socket.on('ms', msg => {
    var jmsg = JSON.parse(msg);
    mous(jmsg);
  });
  socket.on('ct', msg => {
    var jmsg = JSON.parse(msg);
    cont(jmsg);
  });
  socket.on("disconnect", () => {
    c_socket_id = -1;
  });
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

var moved = false, mouse_stamp = Date.now();
var old_a = 0, old_b = 0;
var lclicked = 0, rclicked = 0;
setInterval(() => { if (Date.now() - mouse_stamp > 1000) { moved = false; } }, 1000);
var mous = (async (jmsg) => {
  let a = jmsg.X * 1920 * 0.8, b = jmsg.Y * 1080 * 0.8;
  if (old_a != a || old_b != b || jmsg.leftClick || jmsg.rightClick || jmsg.scroll) {
    old_a = a;
    old_b = b;
    moved = true;
    mouse_stamp = Date.now();
  }
  if (!moved) return;
  const target = new Point(a, b);
  await mouse.setPosition(target);
  if (jmsg.leftClick != lclicked) {
    if (lclicked == 0) {
      lclicked = 1;
      await mouse.pressButton(Button.LEFT);
    }
    else {
      lclicked = 0;
      await mouse.releaseButton(Button.LEFT);
    }
  }
  if (jmsg.rightClick != rclicked) {
    if (rclicked == 0) {
      rclicked = 1;
      await mouse.pressButton(Button.RIGHT);
    }
    else {
      rclicked = 0;
      await mouse.releaseButton(Button.RIGHT);
    }
  }
  if (jmsg.scroll > 0) await mouse.scrollDown(75);
  else if (jmsg.scroll < 0) await mouse.scrollUp(75);

});


// let controller1 = client.createX360Controller();
// controller1.connect();
// controller1.updateMode = "manual";
// let controller2 = client.createX360Controller();
// controller2.connect();
// controller2.updateMode = "manual";

// var controller_set = {};
// controller_set[0] = controller1;
// controller_set[1] = controller2;
// // var active_set = {};
// let keySet = Object.keys(controller_set);

var cont = (jmsg) => {
  let jmsg_len = Object.keys(jmsg).length;
  for (let i = 0; i < keySet.length; i++) {
    if (i + 1 > jmsg_len) break;
    x = jmsg[keySet[i]];
    controller_set[i].axis.leftX.setValue(x.axes[0]);
    controller_set[i].axis.leftY.setValue(-x.axes[1]);
    controller_set[i].axis.rightX.setValue(x.axes[2]);
    controller_set[i].axis.rightY.setValue(-x.axes[3]);
    controller_set[i].axis.leftTrigger.setValue(x.buttons[6]);
    controller_set[i].axis.rightTrigger.setValue(x.buttons[7]);
    controller_set[i].button.A.setValue(x.buttons[0]);
    controller_set[i].button.B.setValue(x.buttons[1]);
    controller_set[i].button.X.setValue(x.buttons[2]);
    controller_set[i].button.Y.setValue(x.buttons[3]);
    controller_set[i].button.LEFT_THUMB.setValue(x.buttons[10]);
    controller_set[i].button.RIGHT_THUMB.setValue(x.buttons[11]);
    controller_set[i].button.BACK.setValue(x.buttons[8]);
    controller_set[i].button.START.setValue(x.buttons[9]);
    controller_set[i].button.LEFT_SHOULDER.setValue(x.buttons[4]);
    controller_set[i].button.RIGHT_SHOULDER.setValue(x.buttons[5]);
    controller_set[i].axis.dpadHorz.setValue(-x.buttons[14] + x.buttons[15]);
    controller_set[i].axis.dpadVert.setValue(x.buttons[12] - x.buttons[13]);
    controller_set[i].update();
  }
};


var key_status = {};
var key_stamp = Date.now();
setInterval(() => { if (Date.now() - key_stamp > 1000) { let j = Object.keys(key_status); for (let i = 0; i < j.length; i++) { if (key_stamp[j[i]]) press(0, j[i]); } } }, 1000);
var press = (async (p, c) => {
  if (p == 1) {
    key_status[c] = 1;
  }
  else {
    key_status[c] = 0;
  }
  key_stamp = Date.now();
  switch (c) {
    case 32: if (p == 1) { await keyboard.pressKey(Key.Space); } else { await keyboard.releaseKey(Key.Space); } break;
    case 27: if (p == 1) { await keyboard.pressKey(Key.Escape); } else { await keyboard.releaseKey(Key.Escape); } break;
    case 9: if (p == 1) { await keyboard.pressKey(Key.Tab); } else { await keyboard.releaseKey(Key.Tab); } break;
    case 18: if (p == 1) { await keyboard.pressKey(Key.LeftAlt); } else { await keyboard.releaseKey(Key.LeftAlt); } break;
    case 17: if (p == 1) { await keyboard.pressKey(Key.LeftControl); } else { await keyboard.releaseKey(Key.LeftControl); } break;
    case 16: if (p == 1) { await keyboard.pressKey(Key.LeftShift); } else { await keyboard.releaseKey(Key.LeftShift); } break;
    // case 112: if (p == 1) { await keyboard.pressKey(Key.F1); } else { await keyboard.releaseKey(Key.F1); } break;
    // case 113: if (p == 1) { await keyboard.pressKey(Key.F2); } else { await keyboard.releaseKey(Key.F2); } break;
    // case 114: if (p == 1) { await keyboard.pressKey(Key.F3); } else { await keyboard.releaseKey(Key.F3); } break;
    // case 115: if (p == 1) { await keyboard.pressKey(Key.F4); } else { await keyboard.releaseKey(Key.F4); } break;
    // case 116: if (p == 1) { await keyboard.pressKey(Key.F5); } else { await keyboard.releaseKey(Key.F5); } break;
    // case 117: if (p == 1) { await keyboard.pressKey(Key.F6); } else { await keyboard.releaseKey(Key.F6); } break;
    // case 118: if (p == 1) { await keyboard.pressKey(Key.F7); } else { await keyboard.releaseKey(Key.F7); } break;
    // case 119: if (p == 1) { await keyboard.pressKey(Key.F8); } else { await keyboard.releaseKey(Key.F8); } break;
    // case 120: if (p == 1) { await keyboard.pressKey(Key.F9); } else { await keyboard.releaseKey(Key.F9); } break;
    // case 121: if (p == 1) { await keyboard.pressKey(Key.F10); } else { await keyboard.releaseKey(Key.F10); } break;
    // case 122: if (p == 1) { await keyboard.pressKey(Key.F11); } else { await keyboard.releaseKey(Key.F11); } break;
    // case 123: if (p == 1) { await keyboard.pressKey(Key.F12); } else { await keyboard.releaseKey(Key.F12); } break;
    case 48: if (p == 1) { await keyboard.pressKey(Key.Num0); } else { await keyboard.releaseKey(Key.Num0); } break;
    case 49: if (p == 1) { await keyboard.pressKey(Key.Num1); } else { await keyboard.releaseKey(Key.Num1); } break;
    case 50: if (p == 1) { await keyboard.pressKey(Key.Num2); } else { await keyboard.releaseKey(Key.Num2); } break;
    case 51: if (p == 1) { await keyboard.pressKey(Key.Num3); } else { await keyboard.releaseKey(Key.Num3); } break;
    case 52: if (p == 1) { await keyboard.pressKey(Key.Num4); } else { await keyboard.releaseKey(Key.Num4); } break;
    case 53: if (p == 1) { await keyboard.pressKey(Key.Num5); } else { await keyboard.releaseKey(Key.Num5); } break;
    case 54: if (p == 1) { await keyboard.pressKey(Key.Num6); } else { await keyboard.releaseKey(Key.Num6); } break;
    case 55: if (p == 1) { await keyboard.pressKey(Key.Num7); } else { await keyboard.releaseKey(Key.Num7); } break;
    case 56: if (p == 1) { await keyboard.pressKey(Key.Num8); } else { await keyboard.releaseKey(Key.Num8); } break;
    case 57: if (p == 1) { await keyboard.pressKey(Key.Num9); } else { await keyboard.releaseKey(Key.Num9); } break;
    case 65: if (p == 1) { await keyboard.pressKey(Key.A); } else { await keyboard.releaseKey(Key.A); } break;
    case 66: if (p == 1) { await keyboard.pressKey(Key.B); } else { await keyboard.releaseKey(Key.B); } break;
    case 67: if (p == 1) { await keyboard.pressKey(Key.C); } else { await keyboard.releaseKey(Key.C); } break;
    case 68: if (p == 1) { await keyboard.pressKey(Key.D); } else { await keyboard.releaseKey(Key.D); } break;
    case 69: if (p == 1) { await keyboard.pressKey(Key.E); } else { await keyboard.releaseKey(Key.E); } break;
    case 70: if (p == 1) { await keyboard.pressKey(Key.F); } else { await keyboard.releaseKey(Key.F); } break;
    case 71: if (p == 1) { await keyboard.pressKey(Key.G); } else { await keyboard.releaseKey(Key.G); } break;
    case 72: if (p == 1) { await keyboard.pressKey(Key.H); } else { await keyboard.releaseKey(Key.H); } break;
    case 73: if (p == 1) { await keyboard.pressKey(Key.I); } else { await keyboard.releaseKey(Key.I); } break;
    case 74: if (p == 1) { await keyboard.pressKey(Key.J); } else { await keyboard.releaseKey(Key.J); } break;
    case 75: if (p == 1) { await keyboard.pressKey(Key.K); } else { await keyboard.releaseKey(Key.K); } break;
    case 76: if (p == 1) { await keyboard.pressKey(Key.L); } else { await keyboard.releaseKey(Key.L); } break;
    case 77: if (p == 1) { await keyboard.pressKey(Key.M); } else { await keyboard.releaseKey(Key.M); } break;
    case 78: if (p == 1) { await keyboard.pressKey(Key.N); } else { await keyboard.releaseKey(Key.N); } break;
    case 79: if (p == 1) { await keyboard.pressKey(Key.O); } else { await keyboard.releaseKey(Key.O); } break;
    case 80: if (p == 1) { await keyboard.pressKey(Key.P); } else { await keyboard.releaseKey(Key.P); } break;
    case 81: if (p == 1) { await keyboard.pressKey(Key.Q); } else { await keyboard.releaseKey(Key.Q); } break;
    case 82: if (p == 1) { await keyboard.pressKey(Key.R); } else { await keyboard.releaseKey(Key.R); } break;
    case 83: if (p == 1) { await keyboard.pressKey(Key.S); } else { await keyboard.releaseKey(Key.S); } break;
    case 84: if (p == 1) { await keyboard.pressKey(Key.T); } else { await keyboard.releaseKey(Key.T); } break;
    case 85: if (p == 1) { await keyboard.pressKey(Key.U); } else { await keyboard.releaseKey(Key.U); } break;
    case 86: if (p == 1) { await keyboard.pressKey(Key.V); } else { await keyboard.releaseKey(Key.V); } break;
    case 87: if (p == 1) { await keyboard.pressKey(Key.W); } else { await keyboard.releaseKey(Key.W); } break;
    case 88: if (p == 1) { await keyboard.pressKey(Key.X); } else { await keyboard.releaseKey(Key.X); } break;
    case 89: if (p == 1) { await keyboard.pressKey(Key.Y); } else { await keyboard.releaseKey(Key.Y); } break;
    case 90: if (p == 1) { await keyboard.pressKey(Key.Z); } else { await keyboard.releaseKey(Key.Z); } break;
    case 189: if (p == 1) { await keyboard.pressKey(Key.Minus); } else { await keyboard.releaseKey(Key.Minus); } break;
    case 187: if (p == 1) { await keyboard.pressKey(Key.Equal); } else { await keyboard.releaseKey(Key.Equal); } break;
    case 8: if (p == 1) { await keyboard.pressKey(Key.Backspace); } else { await keyboard.releaseKey(Key.Backspace); } break;
    case 219: if (p == 1) { await keyboard.pressKey(Key.LeftBracket); } else { await keyboard.releaseKey(Key.LeftBracket); } break;
    case 221: if (p == 1) { await keyboard.pressKey(Key.RightBracket); } else { await keyboard.releaseKey(Key.RightBracket); } break;
    case 220: if (p == 1) { await keyboard.pressKey(Key.Backslash); } else { await keyboard.releaseKey(Key.Backslash); } break;
    case 186: if (p == 1) { await keyboard.pressKey(Key.Semicolon); } else { await keyboard.releaseKey(Key.Semicolon); } break;
    case 222: if (p == 1) { await keyboard.pressKey(Key.Quote); } else { await keyboard.releaseKey(Key.Quote); } break;
    case 13: if (p == 1) { await keyboard.pressKey(Key.Return); } else { await keyboard.releaseKey(Key.Return); } break;
    case 188: if (p == 1) { await keyboard.pressKey(Key.Comma); } else { await keyboard.releaseKey(Key.Comma); } break;
    case 190: if (p == 1) { await keyboard.pressKey(Key.Period); } else { await keyboard.releaseKey(Key.Period); } break;
    case 191: if (p == 1) { await keyboard.pressKey(Key.Slash); } else { await keyboard.releaseKey(Key.Slash); } break;
    case 37: if (p == 1) { await keyboard.pressKey(Key.Left); } else { await keyboard.releaseKey(Key.Left); } break;
    case 38: if (p == 1) { await keyboard.pressKey(Key.Up); } else { await keyboard.releaseKey(Key.Up); } break;
    case 39: if (p == 1) { await keyboard.pressKey(Key.Right); } else { await keyboard.releaseKey(Key.Right); } break;
    case 40: if (p == 1) { await keyboard.pressKey(Key.Down); } else { await keyboard.releaseKey(Key.Down); } break;
    case 44: if (p == 1) { await keyboard.pressKey(Key.Print); } else { await keyboard.releaseKey(Key.Print); } break;
    case 19: if (p == 1) { await keyboard.pressKey(Key.Pause); } else { await keyboard.releaseKey(Key.Pause); } break;
    case 45: if (p == 1) { await keyboard.pressKey(Key.Insert); } else { await keyboard.releaseKey(Key.Insert); } break;
    case 46: if (p == 1) { await keyboard.pressKey(Key.Delete); } else { await keyboard.releaseKey(Key.Delete); } break;
    case 36: if (p == 1) { await keyboard.pressKey(Key.Home); } else { await keyboard.releaseKey(Key.Home); } break;
    case 35: if (p == 1) { await keyboard.pressKey(Key.End); } else { await keyboard.releaseKey(Key.End); } break;
    case 33: if (p == 1) { await keyboard.pressKey(Key.PageUp); } else { await keyboard.releaseKey(Key.PageUp); } break;
    case 34: if (p == 1) { await keyboard.pressKey(Key.PageDown); } else { await keyboard.releaseKey(Key.PageDown); } break;
    case 107: if (p == 1) { await keyboard.pressKey(Key.Add); } else { await keyboard.releaseKey(Key.Add); } break;
    case 109: if (p == 1) { await keyboard.pressKey(Key.Subtract); } else { await keyboard.releaseKey(Key.Subtract); } break;
    case 106: if (p == 1) { await keyboard.pressKey(Key.Multiply); } else { await keyboard.releaseKey(Key.Multiply); } break;
    case 111: if (p == 1) { await keyboard.pressKey(Key.Divide); } else { await keyboard.releaseKey(Key.Divide); } break;
    case 110: if (p == 1) { await keyboard.pressKey(Key.Decimal); } else { await keyboard.releaseKey(Key.Decimal); } break;
    case 92: if (p == 1) { await keyboard.pressKey(Key.Enter); } else { await keyboard.releaseKey(Key.Enter); } break;
    // case 96: if (p == 1) { await keyboard.pressKey(Key.NumPad0); } else { await keyboard.releaseKey(Key.NumPad0); } break;
    // case 97: if (p == 1) { await keyboard.pressKey(Key.NumPad1); } else { await keyboard.releaseKey(Key.NumPad1); } break;
    // case 98: if (p == 1) { await keyboard.pressKey(Key.NumPad2); } else { await keyboard.releaseKey(Key.NumPad2); } break;
    // case 99: if (p == 1) { await keyboard.pressKey(Key.NumPad3); } else { await keyboard.releaseKey(Key.NumPad3); } break;
    // case 100: if (p == 1) { await keyboard.pressKey(Key.NumPad4); } else { await keyboard.releaseKey(Key.NumPad4); } break;
    // case 101: if (p == 1) { await keyboard.pressKey(Key.NumPad5); } else { await keyboard.releaseKey(Key.NumPad5); } break;
    // case 102: if (p == 1) { await keyboard.pressKey(Key.NumPad6); } else { await keyboard.releaseKey(Key.NumPad6); } break;
    // case 103: if (p == 1) { await keyboard.pressKey(Key.NumPad7); } else { await keyboard.releaseKey(Key.NumPad7); } break;
    // case 104: if (p == 1) { await keyboard.pressKey(Key.NumPad8); } else { await keyboard.releaseKey(Key.NumPad8); } break;
    // case 105: if (p == 1) { await keyboard.pressKey(Key.NumPad9); } else { await keyboard.releaseKey(Key.NumPad9); } break;
    case 20: if (p == 1) { await keyboard.pressKey(Key.CapsLock); } else { await keyboard.releaseKey(Key.CapsLock); } break;
    case 145: if (p == 1) { await keyboard.pressKey(Key.ScrollLock); } else { await keyboard.releaseKey(Key.ScrollLock); } break;
    case 144: if (p == 1) { await keyboard.pressKey(Key.NumLock); } else { await keyboard.releaseKey(Key.NumLock); } break;
  }

  //await new Promise(resolve => setTimeout(resolve, 4000));
});
