const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const env = require('../env');

if (env.isDev) {
  mongoose.Promise = global.Promise;

  mongoose.connect(env.db_uri_test).catch(err => {
    console.log('-> ', err);
  });

  mongoose.connection.on('error', error => {
    console.log('error', 'Mongoose Test connection error: ' + error);
  });

  mongoose.connection.once('open', function () {
    console.log('-> ', 'Mongoose Test has been connected!');
  });

}
const mongoose_test = env.isDev ? mongoose : null;

module.exports = {
  mongoose_test,
  Schema
};
