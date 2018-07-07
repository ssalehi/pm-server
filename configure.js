/**
 * Created by Eabasir on 31/01/2017.
 */
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
const _const = require('./lib/const.list');
const env = require('./env');
const fs = require('fs');
const appPages = {feed: true, my_shop: true};
const copydir = require('copy-dir');
const warehouses = require('./warehouses');


SALT_WORK_FACTOR = 10;
let PLACEMENTS = null;
let pKeys = [];
let _hash;


db.dbIsReady()
  .then(() => {

    copydir.sync('assets', 'public/assets');
    return models['Warehouse'].find().lean();
  })
  .then(res => {
    if (!res || res.length === 0) {

      return models['Warehouse'].insertMany(warehouses);
    }
    else
      return Promise.resolve();
  })
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
    _hash = hash;
    return models['Agent'].find().lean();

  })
  .then(res => {
    if (!res || res.length === 0) {
      let agents = [{
        username: 'admin@persianmode.com',
        secret: _hash,
        access_level: _const.ACCESS_LEVEL.ContentManager,
        first_name: 'Content',
        surname: 'Manager',
      }, {
        username: 'sm@persianmode.com',
        secret: _hash,
        access_level: _const.ACCESS_LEVEL.SalesManager,
        first_name: 'Sales',
        surname: 'Manager',
      }, {
        username: 'hc@persianmode.com',
        secret: _hash,
        access_level: _const.ACCESS_LEVEL.HubClerk,
        first_name: 'hub',
        surname: 'clerck',
      }, {
        username: 'shop@persianmode.com',
        secret: _hash,
        access_level: _const.ACCESS_LEVEL.ShopClerk,
        first_name: 'shop',
        surname: 'clerck',
      }];

      return models['Agent'].insertMany(agents);
    } else
      return Promise.resolve()
  })
  .then(() => {
    console.log('-> ', 'default agents has been added!');
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
    return models['LoyaltyGroup'].find().lean();
  })
  .then(res => {
    if (!res || !res.length)
      return models['LoyaltyGroup'].insertMany([
        {
          name: 'White',
          min_score: 0,
        },
        {
          name: 'Orange',
          min_score: 5000,
        },
        {
          name: 'Black',
          min_score: 11000,
        }
      ], {ordered: false});

    return Promise.resolve();
  })
  .then(res => {
    console.log('-> ', 'loyalty groups are added');
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
    else {
      console.log('-> ', 'dictionary is added');
    }
    process.exit();
  }
  );


