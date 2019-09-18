const rp = require('request-promise');
const lib = require('../../../lib');
const errors = require('../../../lib/errors.list');
const _const = require('../../../lib/const.list');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');
const mongoose = require('mongoose');

describe("Free Delivery GET API", () => {
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
          },
          {
            _id: mongoose.Types.ObjectId(),
            province: 'فارس',
            min_price: 4000000,
          },
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

  it("should get free delivery options", function (done) {
    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`/delivery/cost/free`),
      body: {},
      jar: salesManager.rpJar,
      json: true,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);

        res = res.body;

        expect(res.length).toBe(3);
        expect(res.map(el => el.province)).toContain(freeDeliveryOptions[0].province);
        expect(res.map(el => el.province)).toContain(freeDeliveryOptions[1].province);
        expect(res.map(el => el.province)).toContain(freeDeliveryOptions[2].province);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});