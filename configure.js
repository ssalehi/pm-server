/**
 * Created by Eabasir on 31/01/2017.
 */
const db = require('./mongo');
const env = require('./env');
const AgentModel = require('./mongo/agent');
const _const = require('./lib/const.list');


let admin = AgentModel({

  name: 'admin@persianmode.com',
  secret: 'admin@123',
  access_level: _const.ACCESS_LEVEL.Admin
});

admin.save().then(() => {

  console.log('-> ', 'default admin has been added!');
}).then(() => {
  process.exit();
}).catch(err => {
  console.log('-> ', err);
  process.exit();

});


