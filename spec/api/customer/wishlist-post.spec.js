const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');
const mongoose = require('mongoose');


describe('Set Address', () => {
  // I need some instance of customer and product for my test

  let customerObj = {
    cid: null,
    jar: null};
  let customerObj2 = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        return lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {first_name: 'Sareh', surname: 'Salehi'})
      }).then(res => {
      let rpJar = null;
      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;
      return lib.dbHelpers.addAndLoginCustomer('a@a.com', '654321', {
        first_name: 'Ali',
        surname: 'Alavi'
      })
    })
      .then(res => {
        let rpJar = null;
        customerObj2.cid = res.cid;
        customerObj2.jar = res.rpJar;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

})