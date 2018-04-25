const env = require('../env');
const session = require('../session');
const socketIOSession = require("socket.io.session");
const passportSocketIO = require('passport.socketio');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const redis = require('../redis');
const error = require('../lib/errors.list');

/**
 * socket.broadcast.emit() behaves similar to io.sockets.emit ,
 * but instead of emitting to all connected sockets it will emit to all connected socket except the one it is being called on.
 *
 */
let groups = {};
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

  io.set('transports', ['websocket']);

  let socketSession = socketIOSession(session.session_config());

  //parse the "/" namespace
  io.use(socketSession.parser);

  io.on('connection', socket => {

    let user = socket.session.passport.user;
    if (user && user.warehouse_id)
      setGroup(user.warehouse_id);

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

let setGroup = (ns) => {

  if (!groups[ns]) {

    groups[ns] = io
      .of(`/${ns}`)
      .on('connection', function (socket) {
        console.log(`-> new user has been connected to ${ns}`);
      });
  }
};

/**
 *
 * @param ns => warehouse id
 * @param message => is an object such as : {type: ... , data: ...}
 * @returns {Promise}
 */
let sendToNS = (ns, message) => {

  if (!message.type || !message.data)
    return Promise.reject(error.invalidSocketMessageType);

  return new Promise((resolve, reject) => {
    setTimeout(() => {

      if (groups[ns]) {
        groups[ns].emit('msg', message);
        resolve();
      } else {
        console.log('-> ', `${ns} is not in namespaces`);
        reject(new Error(`${ns} is not in namespaces`));
      }
    }, 0)
  })


};


module.exports = {
  setup,
  setGroup,
  sendToNS
};
