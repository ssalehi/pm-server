/**
 * Created by Eabasir on 31/01/2017.
 */
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
const _const = require('./lib/const.list');

db.dbIsReady()
  .then(() => {
    let admin = new models['Agent']({
      username: 'admin@persianmode.com',
      secret: 'admin@123',
      access_level: _const.ACCESS_LEVEL.Admin,
      first_name: 'Admin',
      surname: 'Admin',
    });

    admin.save()
      .then(() => {
        console.log('-> ', 'default admin has been added!');
      })
      .then(() => {
        process.exit();
      })
      .catch(err => {
        console.log('-> ', err);
        process.exit();
      });
  })
;


