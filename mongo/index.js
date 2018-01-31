const env = require('../env');
const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

let testConnection, prodConnection;

prodConnection = mongoose.createConnection(env.db_uri);

prodConnection.on('connected', function () {
  console.log('-> ', 'Mongoose has been connected!');
});

if (env.isDev) {

  testConnection = mongoose.createConnection(env.db_uri_test);

  prodConnection.on('connected', function () {
    console.log('-> ', 'Mongoose test has been connected!');
  });

}



module.exports= {
  prodConnection,
  testConnection
};

