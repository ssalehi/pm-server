/**
 * Created by Eabasir on 31/01/2017.
 */
const models = require('./mongo/models.mongo');
const db = require('./mongo/index');
const _const = require('./lib/const.list');
const env = require('./env');
const fs = require('fs');
const appPages = {feed: true, my_shop: true};
const mongoose = require('mongoose');
const copydir = require('copy-dir');


SALT_WORK_FACTOR = 10;
let PLACEMENTS = null;
let pKeys = [];
let _hash;


db.dbIsReady()
  .then(() => {

    copydir.sync('assets', 'public/assets');
    console.log('-> ', 'here');
    return models['Warehouse'].find().lean();
  })
  .then(res => {
    if (!res || res.length === 0) {
      let warehouses = [
        {
          _id: mongoose.Types.ObjectId(),
          name: 'انبار مرکزی',
          phone: 'نا مشخص',
          address: {
            city: 'تهران',
            street: 'نامشخص',
            province: 'تهران'
          },
          is_center: true,
          priority: 0,

        },
        {
          _id: mongoose.Types.ObjectId(),
          name: 'پالادیوم',
          phone: ' 021 2201 0600',
          has_customer_pickup: true,
          address: {
            city: 'تهران',
            street: 'مقدس اردبیلی',
            province: 'تهران'
          },
          priority: 1,

        },
        {
          _id: mongoose.Types.ObjectId(),
          name: 'سانا',
          phone: '021 7443 8111',
          has_customer_pickup: true,
          address: {
            province: 'تهران',
            city: 'تهران',
            street: 'اندرزگو',
          },
          priority: 2,
        },
        {
          _id: mongoose.Types.ObjectId(),
          name: 'ایران مال',
          phone: 'نا مشخص',
          has_customer_pickup: true,
          address: {
            province: 'تهران',
            city: 'تهران',
            street: 'اتوبان خرازی',
          },
          priority: 3,
        }
      ];

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


