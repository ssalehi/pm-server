const env = require('../env');
const session = require('../session');
const socketIOSession = require("socket.io.session");
const passportSocketIO = require('passport.socketio');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const redis = require('../redis');
const db = require('../mongo/index');
const error = require('../lib/errors.list');

/**
 * socket.broadcast.emit() behaves similar to io.sockets.emit ,
 * but instead of emitting to all connected sockets it will emit to all connected socket except the one it is being called on.
 *
 */
let rooms = [];
let io;
let setup = http => {

  io = require('socket.io').listen(http);

  io.use(passportSocketIO.authorize({
    key: session.session_config().key,
    secret: session.session_config().secret,
    store: session.session_config().store,
    passport,
    cookieParser,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  }));

  io.adapter(redis.redis_socket({host: env.redisHost, port: env.redisPort}));

  // io.set('transports', ['websocket']);

  let socketSession = socketIOSession(session.session_config());

  //parse the "/" namespace
  io.use(socketSession.parser);

  io.on('connection', socket => {
    if (socket.session.passport) {
      let user = socket.session.passport.user;
      if (user && user.warehouse_id) {
        setRoom(socket, user.warehouse_id);
      }
    }
  });

};

function onAuthorizeSuccess(data, accept) {
  accept();
}

function onAuthorizeFail(data, message, error, accept) {
  if (error)
    accept(new Error(message));

  console.log('Failed connection  to socket.io', message);
  accept(null, false);
}

let setRoom = (socket, name) => {
  socket.join(name);
  if (name && !rooms.find(x => x === name)) {
    rooms.push(name);
    console.log(`-> new user has been joined to room: ${name}`);
  }
}

/**
 *
 * @param name => warehouse id
 * @param message 
 * @returns {Promise}
 */
let sendToNS = (name, message = null) => {

  name = name.toString();

  return new Promise((resolve, reject) => {
    setTimeout(() => {

      if (rooms.find(x => x === name)) {
        io.to(name).emit('msg', message);
      } else {
        console.log('-> ', `${name} is not in rooms`);
      }
      resolve();
    }, 0)
  })


};


module.exports = {
  setup,
  sendToNS,
  setRoom
};
