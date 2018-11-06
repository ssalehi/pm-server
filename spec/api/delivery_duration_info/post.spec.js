const rp = require('request-promise');
const lib = require('../../../lib');
const _const = require('../../../lib/const.list');
const errors = require('../../../lib/errors.list');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');
const mongoose = require('mongoose');

describe("Free Delivery POST API", () => {
  let salesManager, deliveries = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => models()['WarehouseTest'].insertMany(warehouses))
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(el => !el.is_hub && !el.has_customer_pickup)._id)
      })
      .then(res => {
        salesManager = res;
        salesManager._id = res.aid;

        deliveries = [
          {
            _id: mongoose.Types.ObjectId(),
            add_point: null,
            cities: [
              {
                _id: mongoose.Types.ObjectId(),
                name: "تهران",
                delivery_cost: 12000
              }
            ],
            delivery_days: 5,
            delivery_loyalty: [
              {
                _id: mongoose.Types.ObjectId(),
                name: "White",
                price: 15,
                discount: 0
              },
              {
                _id: mongoose.Types.ObjectId(),
                name: "Orange",
                price: 20,
                discount: 0
              },
              {
                _id: mongoose.Types.ObjectId(),
                name: "Black",
                price: 25,
                discount: 0
              }
            ],
            free_delivery_options: [
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
            ],
            is_c_and_c: false,
            name: "پنج روزه"
          }
        ];

        return models()['DeliveryDurationInfoTest'].insertMany(deliveries);
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
        delivery_duration_id: deliveries[0]._id,
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
        return models()['DeliveryDurationInfoTest'].findOne({_id: deliveries[0]._id});
      })
      .then(res => {
        expect(res.free_delivery_options.length).toBe(3);
        const newFreeDelivery = res.free_delivery_options.find(el => el._id.toString() === newId.toString());
        expect(newFreeDelivery.province).toBe('فارس');
        expect(newFreeDelivery.min_price).toBe(4000000);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Sales manager should get an error when define free delivery with duplicated province", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        delivery_duration_id: deliveries[0]._id,
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
        id: deliveries[0].free_delivery_options[0]._id,
        delivery_duration_id: deliveries[0]._id,
        province: 'کرمان',
        min_price: 2000000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryDurationInfoTest'].findOne({_id: deliveries[0]._id});
      })
      .then(res => {
        expect(res.free_delivery_options.length).toBe(2);
        const updatedFreeDelivery = res.free_delivery_options.find(el => el._id.toString() === deliveries[0].free_delivery_options[0]._id.toString());
        expect(updatedFreeDelivery.province).toBe('کرمان');
        expect(updatedFreeDelivery.min_price).toBe(2000000);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Sales manager should get error when set exist province as province to update data", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        id: deliveries[0].free_delivery_options[0]._id,
        delivery_duration_id: deliveries[0]._id,
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
        delivery_duration_id: deliveries[0]._id,
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

  it("Sales manager should get error when delivery_duration_id is not passed on update mode", function(done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {
        id: deliveries[0].free_delivery_options[0]._id,
        province: 'کرمان',
        min_price: 2000000
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Update free delivery option without passed delivery_duration_id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });
});

describe("Free Delivery DELETE API", () => {
  let salesManager, deliveries = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => models()['WarehouseTest'].insertMany(warehouses))
      .then(() => lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(el => el.is_hub)))
      .then(res => {
        salesManager = res;
        salesManager._id = res.aid;

        deliveries = [
          {
            _id: mongoose.Types.ObjectId(),
            add_point: null,
            cities: [
              {
                _id: mongoose.Types.ObjectId(),
                name: "تهران",
                delivery_cost: 12000
              }
            ],
            delivery_days: 5,
            delivery_loyalty: [
              {
                _id: mongoose.Types.ObjectId(),
                name: "White",
                price: 15,
                discount: 0
              },
              {
                _id: mongoose.Types.ObjectId(),
                name: "Orange",
                price: 20,
                discount: 0
              },
              {
                _id: mongoose.Types.ObjectId(),
                name: "Black",
                price: 25,
                discount: 0
              }
            ],
            free_delivery_options: [
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
            ],
            is_c_and_c: false,
            name: "پنج روزه"
          }
        ];

        return models()['DeliveryDurationInfoTest'].insertMany(deliveries);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  }, 10000);

  it("Sales manager should delete free delivery option", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free/delete`),
      body: {
        id: deliveries[0].free_delivery_options[0]._id,
        delivery_duration_id: deliveries[0]._id,
      },
      json: true,
      jar: salesManager.rpJar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryDurationInfoTest'].findOne({
          _id: deliveries[0]._id,
        });
      })
      .then(res => {
        expect(res.free_delivery_options.length).toBe(1);
        expect(res.free_delivery_options.find(el => el._id.toString() === deliveries[0].free_delivery_options[0]._id.toString())).toBeUndefined();
        expect(res.free_delivery_options.find(el => el._id.toString() === deliveries[0].free_delivery_options[1]._id.toString())).toBeDefined();
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
        delivery_duration_id: deliveries[0]._id,
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

  it("Sales manager should get an error when delivery_duration_id is not passed", function (done) {
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
        this.fail('Delete a free delivery options without passed delivery_duration_id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });
});