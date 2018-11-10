const rp = require('request-promise');
const lib = require('../../../lib');
const _const = require('../../../lib/const.list');
const errors = require('../../../lib/errors.list');
const warehouses = require('../../../warehouses');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe("Delivery POST API", () => {
  let deliveryAgents = [], deliveries = [];

  beforeEach(done => {
    deliveryAgents = [];
    lib.dbHelpers.dropAll()
      .then(() => models()['WarehouseTest'].insertMany(warehouses))
      .then(() => lib.dbHelpers.addAndLoginAgent('da1', _const.ACCESS_LEVEL.DeliveryAgent))
      .then(res => {
        deliveryAgents.push(res);
        return lib.dbHelpers.addAndLoginAgent('da2', _const.ACCESS_LEVEL.DeliveryAgent);
      })
      .then(res => {
        deliveryAgents.push(res);

        const customerId = mongoose.Types.ObjectId();
        const addressId = mongoose.Types.ObjectId();
        const hubId = warehouses.find(el => el.is_hub)._id;
        const orderIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];

        deliveries = [
          {
            _id: mongoose.Types.ObjectId(),
            order_id: orderIds[0],
            order_line_id: mongoose.Types.ObjectId(),
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: customerId,
                address_id: addressId,
              }
            },
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_id: orderIds[0],
            order_line_id: mongoose.Types.ObjectId(),
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: customerId,
                address_id: addressId,
              }
            },
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_id: orderIds[1],
            order_line_id: mongoose.Types.ObjectId(),
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: customerId,
                address_id: addressId,
              }
            },
            delivery_agent: deliveryAgents[0].aid,
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_id: orderIds[0],
            order_line_id: mongoose.Types.ObjectId(),
            from: {
              customer: {
                id: customerId,
                address_id: addressId,
              }
            },
            to: {
              warehouse_id: hubId
            },
            is_return: true,
            start: Date(2010, 11, 10),
            end: Date(2010, 11, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_id: orderIds[2],
            order_line_id: mongoose.Types.ObjectId(),
            from: {
              customer: {
                id: customerId,
                address_id: addressId,
              }
            },
            to: {
              warehouse_id: hubId
            },
            is_return: true,
            delivery_agent: deliveryAgents[0].aid,
            start: new Date(),
          },
        ];

        return models()['DeliveryTest'].insertMany(deliveries);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  }, 10000);

  it("Delivery agent should choose (and assign to himself) multiple delivery items", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: [deliveries[1]._id, deliveries[3]._id]
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[1].aid
        });
      })
      .then(res => {
        expect(res.length).toBe(2);
        expect(res.map(el => el._id.toString())).toContain(deliveries[1]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[3]._id.toString());
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should get nothing when passed id already was assigned to current delivery agent (not another perosn)", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: [deliveries[0]._id, deliveries[1]._id, deliveries[2]._id]
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[0].aid,
        });
      })
      .then(res => {
        expect(res.length).toBe(4);
        expect(res.map(el => el._id.toString())).toContain(deliveries[0]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[1]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[2]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[4]._id.toString());
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should do nothing when passed list ids is empty", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: []
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryTest'].find({
          delivery_agent: deliveryAgents[1].aid,
        });
      })
      .then(res => {
        expect(res.length).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  })

  it("Should get error when passed id already was assigned to another delivery agent", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: [deliveries[0]._id, deliveries[1]._id, deliveries[2]._id]
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Delivery agent can assign already assigned deliveries');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.deliveryItemIsAlreadyAssigned.status);
        expect(err.error).toBe(errors.deliveryItemIsAlreadyAssigned.message);
        done();
      });
  });

  it("Should get error passed data is incomplete", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {

      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Delivery agent can assign some deliveries with incomplete passed data');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });
});