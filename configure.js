/**
 * Created by Eabasir on 31/01/2017.
 */
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
const _const = require('./lib/const.list');
const env = require('./env');
const fs = require('fs');

SALT_WORK_FACTOR = 10;

db.dbIsReady()
  .then(() => {

    return new Promise((resolve, reject) => {
      env.bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        env.bcrypt.hash('admin@123', salt, null, function (err, hash) {
          if (err) reject(err);

          resolve(hash)
        });
      });
    })
  })
  .then(hash => {
    let query = {},
      update = {
        username: 'admin@persianmode.com',
        secret: hash,
        access_level: _const.ACCESS_LEVEL.Admin,
        first_name: 'Admin',
        surname: 'Admin',
      },
      options = {upsert: true, new: true, setDefaultsOnInsert: true};

    return models['Agent'].findOneAndUpdate(query, update, options);

  })
  .then(() => {
    console.log('-> ', 'default admin has been added!');

    let placement = JSON.parse(fs.readFileSync('homePagePlacements.json', 'utf8'));

    let query = {address: 'home'},
      update = {
        address: 'home',
        is_app: false,
        placement: placement.home
      },
      options = {upsert: true, new: true, setDefaultsOnInsert: true};
    return models['Page'].findOneAndUpdate(query, update, options);
  })
  .then(res => {
    let placement = JSON.parse(fs.readFileSync('app_feed.json', 'utf8'));

    let query = {address: 'feed'},
      update = {
        address: 'feed',
        is_app: true,
        placement: placement.feed
      },
      options = {upsert: true, new: true, setDefaultsOnInsert: true};
    return models['Page'].findOneAndUpdate(query, update, options);
  })
  .then(res => {
    console.log('-> ', 'home page and feed page is added');
    process.exit();
  })
  .catch(err => {
    console.log('-> ', err);
    process.exit();
  });


