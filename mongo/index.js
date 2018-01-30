const mongoose = require('mongoose');
const env = require('../env');

mongoose.Promise = global.Promise;

mongoose.connect(env.db_uri).catch(err => {
  console.log('-> ', err);
});

mongoose.connection.on('error', error => {
  console.log('error', 'Mongoose connection error: ' + error);
});

mongoose.connection.once('open', function () {
  console.log('-> ', 'Mongoose has been connected!');
});


module.exports = {mongoose};
