const env = require('../env');
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

let testConnection, prodConnection;

prodConnection = mongoose.createConnection(env.db_uri);

if (env.isDev) {
  testConnection = mongoose.createConnection(env.db_uri_test);
}

let dbIsReady= () => {

  let testDb = new Promise((resolve , reject) =>{
    testConnection.on('connected', function () {
      console.log('-> ', 'Mongoose test has been connected!');
      resolve();
    });
  });

  let prodDb = new Promise((resolve , reject) =>{
    prodConnection.on('connected', function () {
      console.log('-> ', 'Mongoose product has been connected!');
      resolve();
    });
  });

  return Promise.all([testDb, prodDb])

};


module.exports = {
  prodConnection,
  testConnection,
  dbIsReady,
};

