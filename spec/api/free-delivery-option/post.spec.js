const rp = require('request-promise');
const lib = require('../../../lib');
const _const = require('../../../lib/const.list');
const errors = require('../../../lib/errors.list');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');
const mongoose = require('mongoose');

describe("Free Delivery POST API", () => {
  let salesManager, freeDeliveryOptions = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => models()['WarehouseTest'].insertMany(warehouses))
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(el => !el.is_hub && !el.has_customer_pickup)._id)
      })
      .then(res => {
        salesManager = res;
        salesManager._id = res.aid;

        freeDeliveryOptions = [
          {
            _id: mongoose.Types.ObjectId(),
            province: 'تهران',
            min_price: 1000000,
          },
          {
            _id: mongoose.Types.ObjectId(),
            province: 'اصفهان',
            min_price: 4000000,
          }
        ];

        return models()['FreeDeliveryOptionTest'].insertMany(freeDeliveryOptions);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  }, 100000);

  it("Sales manager should define new free delivery for specific province", function (done) {
    this.done = done;
    let newId = null;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        province: 'فارس',
        min_price: 4000000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        newId = res.body;
        return models()['FreeDeliveryOptionTest'].findOne({_id: newId.toString()});
      })
      .then(res => {
        expect(res.province).toBe('فارس');
        expect(res.min_price).toBe(4000000);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Sales manager should get an error when define free delivery with duplicated province", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        province: 'تهران',
        min_price: 430000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Add new free delivery option with duplicated province name');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.duplicatedProvince.status);
        expect(err.error).toBe(errors.duplicatedProvince.message);
        done();
      });
  });

  it("Sales manager should get an error when passed data is incomplete", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        province: 'فارس',
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Add new free delivery option with incomplete data');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });

  it("Sales manager should update an exist free delivery item", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        id: freeDeliveryOptions[0]._id,
        province: 'کرمان',
        min_price: 2000000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['FreeDeliveryOptionTest'].findOne({_id: freeDeliveryOptions[0]._id});
      })
      .then(res => {
        expect(res.province).toBe('کرمان');
        expect(res.min_price).toBe(2000000);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Sales manager should get error when set exist province as province to update data", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        id: freeDeliveryOptions[0]._id,
        province: 'اصفهان',
        min_price: 3200000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Update a free delivery option with duplicated province');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.duplicatedProvince.status);
        expect(err.error).toBe(errors.duplicatedProvince.message);
        done();
      });
  });

  it("Sales manager should get error when passed id is not valid", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        id: '21213131',
        province: 'کرمان',
        min_price: 3200000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Update a free delivery option with invalid id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.invalidId.status);
        expect(err.error).toBe(errors.invalidId.message);
        done();
      });
  });
});

describe("Free Delivery DELETE API", () => {
  let salesManager, freeDeliveryOptions = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => models()['WarehouseTest'].insertMany(warehouses))
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(el => !el.is_hub && !el.has_customer_pickup)._id)
      })
      .then(res => {
        salesManager = res;
        salesManager._id = res.aid;

        freeDeliveryOptions = [
          {
            _id: mongoose.Types.ObjectId(),
            province: 'تهران',
            min_price: 1000000,
          },
          {
            _id: mongoose.Types.ObjectId(),
            province: 'اصفهان',
            min_price: 4000000,
          }
        ];

        return models()['FreeDeliveryOptionTest'].insertMany(freeDeliveryOptions);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  }, 100000);

  it("Sales manager should delete free delivery option", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free/delete`),
      body: {
        id: freeDeliveryOptions[0]._id,
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['FreeDeliveryOptionTest'].find();
      })
      .then(res => {
        expect(res.length).toBe(1);
        expect(res.find(el => el._id.toString() === freeDeliveryOptions[0]._id.toString())).toBeUndefined();
        expect(res.find(el => el._id.toString() === freeDeliveryOptions[1]._id.toString())).toBeDefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Sales manager should get an error when passed id is not valid", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free/delete`),
      body: {
        id: '2312323',
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Delete a free delivery options with invalid id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.invalidId.status);
        expect(err.error).toBe(errors.invalidId.message);
        done();
      });
  });
});