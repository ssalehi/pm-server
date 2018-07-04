const rp = require('request-promise');
const lib = require('../../../lib/index');
const fs = require('fs');
const path = require('path');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const errors = require('../../../lib/errors.list');
const moment = require('moment');
const _const = require('../../../lib/const.list');

describe("GET API", () => {
  let salesManager;
  let centralWarehouse = {
    _id: mongoose.Types.ObjectId(),
    name: 'انبار مرکزی',
    phone: 'نا مشخص',
    address: {
      city: 'تهران',
      street: 'نامشخص',
      province: 'تهران'
    },
    priority: 0,
  };

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return new models['WarehouseTest'](centralWarehouse).save();
      })
      .then(() => lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, centralWarehouse._id))
      .then(res => {
        salesManager = res;

        let promiseList = [];
        promiseList.push(models['LoyaltyGroupTest']({
          name: 'Gold',
          min_score: 1000,
        }).save());
        promiseList.push(models['LoyaltyGroupTest']({
          name: 'Silver',
          min_score: 500,
        }).save());
        promiseList.push(models['LoyaltyGroupTest']({
          name: 'Bronze',
          min_score: 100,
        }).save());

        return Promise.all(promiseList);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      })
  });

  it("should get all loyalty groups", function (done) {
    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL('loyaltygroup'),
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        res = res.body;
        expect(res.length).toBe(3);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
})