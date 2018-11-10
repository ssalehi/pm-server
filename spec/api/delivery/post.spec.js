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
            processed_by: salesManager._id,
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
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
            processed_by: agentList[1]._id,
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
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
            processed_by: salesManager._id,
            delivery_agent: deliveryAgents[0].aid,
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
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
            processed_by: agentList[1]._id,
            start: Date(2010, 11, 10),
            end: Date(2010, 11, 15)
          },
          {
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
            processed_by: shopClerk2._id,
            delivery_agent: deliveryAgents[0]._id,
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
  });

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
          delivery_agent: deliveryAgents[1]._id
        });
      })
      .then(res => {
        expect(res.length).toBe(2);
        expect(res.map(el => el._id)).toContain(deliveries[1]._id);
        expect(res.map(el => el._id)).toContain(deliveries[3]._id);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should get nothing when passed id already was assigned to current delivery agent (not another perosn)", function (done) {
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
        return models()['DeliveryAgent'].find({
          delivery_agent: deliveryAgents[0]._id,
        });
      })
      .then(res => {
        expect(res.length).toBe(4);
        expect(res.map(el => el._id)).toContain(deliveries[0]._id);
        expect(res.map(el => el._id)).toContain(deliveries[1]._id);
        expect(res.map(el => el._id)).toContain(deliveries[2]._id);
        expect(res.map(el => el._id)).toContain(deliveries[4]._id);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should do nothing when passed list ids is empty", function (done) {
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/assign`),
      body: {
        delivery_ids: []
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['DeliveryAgent'].find({
          delivery_agent: deliveryAgents[1]._id,
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
        expect(err.statusCode).toBe();
        expect(err.error).toBe();
        done();
      });
  });
});