let io;

let groups = {};

let init = (server) => {
  io = require('socket.io')(server);

  io.on('connection', function (socket) {
    socket.emit('news', {hello: 'world'});
    socket.on('my other event', function (data) {
      console.log(data);
    });
  });

  console.log('-> ', 'Socket is Ready!');

};

let setGroup = (token) => {

  if (!groups.token) {

    groups.token = io
      .of(`/${token}`)
      .on('connection', function (socket) {
        console.log(`-> new user has been connected to ${token}`);
      });
  }
};

module.exports = {
  init,
  setGroup,
};