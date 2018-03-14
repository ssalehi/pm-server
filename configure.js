/**
 * Created by Eabasir on 31/01/2017.
 */
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
const _const = require('./lib/const.list');
const env = require('./env');
const fs = require('fs');
const appPages = {feed: true, my_shop: true};

SALT_WORK_FACTOR = 10;
let PLACEMENTS = null;
let pKeys = [];

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
    PLACEMENTS = JSON.parse(fs.readFileSync('placements.json', 'utf8'));
    pKeys = Object.keys(PLACEMENTS);
    return Promise.all(pKeys.map((r, i) => {
      let isApp = !!appPages[r];
      console.log(`-> ${isApp ? 'app' : 'website'} page: '${r}' is added.`);
      let query = {address: r},
        update = {
          address: r,
          is_app: isApp,
          placement: PLACEMENTS[r]
        },

        options = {upsert: true, new: true, setDefaultsOnInsert: true};
      return models['Page'].findOneAndUpdate(query, update, options);
    }))
  })
  .then(res => {
    let query = {address: 'collection/men/shoes'},
      update = {
        address: 'collection/men/shoes',
        is_app: true,
        placement: PLACEMENTS.men,
      },
      options = {upsert: true, new: true, setDefaultsOnInsert: true};
    return models['Page'].findOneAndUpdate(query, update, options);
  })
  .then(res => {
    console.log('-> ', 'collection men shoes page is added for app');

    let dictionary = JSON.parse(fs.readFileSync('dictionary.json', 'utf8'));

    let data = [];

    Object.keys(dictionary).forEach(type => {

      let typeData = dictionary[type];

      data = data.concat(Object.keys(typeData).map(name => {
        return {
          type,
          name,
          value: typeData[name]
        }
      }));
    });


    return models['Dictionary'].insertMany(data, {ordered: false});
  })
  .then(res => {
    console.log('-> ', 'dictionary is added');
    process.exit();
  })
  .catch(err => {
      if (err.name !== 'BulkWriteError') {
        console.log('-> ', err);
      }
      process.exit();
    }
  );


