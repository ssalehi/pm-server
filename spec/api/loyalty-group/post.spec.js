const rp = require('request-promise');
const lib = require('../../../lib/index');
const fs = require('fs');
const path = require('path');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const errors = require('../../../lib/errors.list');
const moment = require('moment');
const _const = require('../../../lib/const.list');

describe('POST API ', () => {
  let salesManager;
  let loyaltyGroupList = [];
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

        loyaltyGroupList.push({
          _id: mongoose.Types.ObjectId(),
          name: 'Gold',
          min_score: 1000,
        });
        loyaltyGroupList.push({
          _id: mongoose.Types.ObjectId(),
          name: 'Silver',
          min_score: 500,
        });
        loyaltyGroupList.push({
          _id: mongoose.Types.ObjectId(),
          name: 'Bronze',
          min_score: 100,
        });

        return Promise.all(loyaltyGroupList.map(el => models['LoyaltyGroupTest'](el).save()));
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  });

  it("should add new loyalty group item", function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        name: 'Blue',
        min_score: 50
      },
      uri: lib.helpers.apiTestURL('loyaltygroup'),
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['LoyaltyGroupTest'].find({name: 'Blue'}).lean();
      })
      .then(res => {
        expect(res.length).toBe(1);
        expect(res[0].min_score).toBe(50);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should error when name or min_score is not defined", function (done) {
    rp({
      method: 'post',
      body: {
        min_score: 20,
      },
      json: true,
      uri: lib.helpers.apiTestURL('loyaltygroup'),
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Sales manager can add new loyalty group without setting name');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });

  it("should update a loyalty group", function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        _id: loyaltyGroupList[0]._id.toString(),
        name: 'Golden',
      },
      json: true,
      uri: lib.helpers.apiTestURL('loyaltygroup'),
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['LoyaltyGroupTest'].find().lean();
      })
      .then(res => {
        expect(res.length).toBe(3);
        expect(res.find(el => el._id.toString() === loyaltyGroupList[0]._id.toString()).name).toBe('Golden');
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get error when name or min_score is exist", function (done) {
    rp({
      method: 'post',
      body: {
        _id: loyaltyGroupList[1]._id.toString(),
        min_score: 1000,
      },
      json: true,
      uri: lib.helpers.apiTestURL('loyaltygroup'),
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Sales manager can update/insert item with duplicated min_score value');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(500);
        done();
      })
  })
});

describe('POST API (DELETE)', () => {
  let salesManager;
  let loyaltyGroupList = [];
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

        loyaltyGroupList.push({
          _id: mongoose.Types.ObjectId(),
          name: 'Gold',
          min_score: 1000,
        });
        loyaltyGroupList.push({
          _id: mongoose.Types.ObjectId(),
          name: 'Silver',
          min_score: 500,
        });
        loyaltyGroupList.push({
          _id: mongoose.Types.ObjectId(),
          name: 'Bronze',
          min_score: 100,
        });

        return Promise.all(loyaltyGroupList.map(el => models['LoyaltyGroupTest'](el).save()));
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  });

  it("should delete the loyalty group", function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        _id: loyaltyGroupList[0]._id,
      },
      json: true,
      uri: lib.helpers.apiTestURL('loyaltygroup/delete'),
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['LoyaltyGroupTest'].find().lean();
      })
      .then(res => {
        expect(res.length).toBe(2);
        expect(res.find(el => el._id.toString() === loyaltyGroupList[0]._id.toString())).toBeUndefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get error when _id is not passed", function (done) {
    rp({
      method: 'post',
      body: {

      },
      json: true,
      uri: lib.helpers.apiTestURL('loyaltygroup/delete'),
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Sales manager can delete loyalty group without specifing the _id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.loyaltyGroupIdIsRequired.status);
        expect(err.error).toBe(errors.loyaltyGroupIdIsRequired.message);
        done();
      });
  })
});