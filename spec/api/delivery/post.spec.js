const rp = require('request-promise');
const lib = require('../../../lib');
const _const = require('../../../lib/const.list');
const errors = require('../../../lib/errors.list');
const warehouses = require('../../../warehouses');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

xdescribe("Fetch Delivery Items POST API", () => {
  let deliveryAgents = [], deliveries = [], orders = [], salesManager, shopClerk, hubClerk;

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      await models()['WarehouseTest'].insertMany(warehouses);
      deliveryAgents = (await Promise.all([
        lib.dbHelpers.addAndLoginAgent('da1', _const.ACCESS_LEVEL.DeliveryAgent),
        lib.dbHelpers.addAndLoginAgent('da2', _const.ACCESS_LEVEL.DeliveryAgent)
      ]));
      const centralId = warehouses.find(el => !el.is_hub && !el.has_customer_pickup)._id;
      const warehouseId = warehouses.find(el => !el.is_hub && el.has_customer_pickup)._id;
      const hubId = warehouses.find(el => el.is_hub)._id;

      salesManager = (await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, centralId));
      shopClerk = (await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouseId));
      hubClerk = (await lib.dbHelpers.addAndLoginAgent('hc', _const.ACCESS_LEVEL.HubClerk, hubId));

      const customerId = mongoose.Types.ObjectId();
      const address = {
        _id: mongoose.Types.ObjectId(),
        province: 'Tehran',
        city: 'Tehran',
        street: 'Zafar'
      };
      const ticket = {
        status: _const.ORDER_STATUS.DeliverySet,
        desc: "descccc",
        timeStamp: new Date(),
        is_processed: false,
        referral_advice: 1123,
        agent_id: mongoose.Types.ObjectId()
      };
      const deliveryStatus = {
        agent_id: mongoose.Types.ObjectId(),
        status: _const.ORDER_STATUS.DeliverySet,
        is_processed: false,
        timeStamp: new Date()
      };

      orders = [
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customerId,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }, {
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customerId,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }, {
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customerId,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customerId,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }, {
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customerId,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }],
          adding_time: new Date(),
        },
        {
          _id: mongoose.Types.ObjectId(),
          customer_id: customerId,
          address: address,
          order_lines: [{
            _id: mongoose.Types.ObjectId(),
            tickets: [ticket],
            product_id: mongoose.Types.ObjectId(),
            product_instance_id: mongoose.Types.ObjectId(),
          }],
          adding_time: new Date(),
        },
      ];

      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[0]._id,
              order_line_ids: orders[0].order_lines.map(el => el._id)
            },
            {
              order_id: orders[1]._id,
              order_line_ids: orders[0].order_lines.map(el => el._id)
            }
          ],
          status_list: [deliveryStatus],
          from: {
            warehouse_id: warehouseId
          },
          to: {
            warehouse_id: hubId
          },
          start: Date(2010, 10, 10),
          end: Date(2010, 10, 12)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[2]._id,
              order_line_ids: orders[2].order_lines.map(el => el._id)
            }
          ],
          from: {
            warehouse_id: hubId
          },
          to: {
            customer: {
              id: orders[0].customer_id,
              address_id: orders[0].address._id,
            }
          },
          status_list: [deliveryStatus],
          start: Date(2010, 10, 11),
          end: Date(2010, 10, 15)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[3]._id,
              order_line_ids: orders[3].order_lines.map(el => el._id)
            },
          ],
          from: {
            warehouse_id: hubId
          },
          to: {
            warehouse_id: warehouseId
          },
          delivery_agent: deliveryAgents[0].aid,
          status_list: [deliveryStatus],
          start: Date(2010, 10, 13),
          end: Date(2010, 10, 15)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[4]._id,
              order_line_ids: orders[4].order_lines.map(el => el._id)
            }
          ],
          from: {
            customer: {
              id: orders[4].customer_id,
              address_id: orders[4].address._id,
            }
          },
          to: {
            warehouse_id: hubId
          },
          is_return: true,
          status_list: [deliveryStatus],
          start: Date(2010, 11, 15),
          end: Date(2010, 11, 20)
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: [
            {
              order_id: orders[5]._id,
              order_line_ids: orders[5].order_lines.map(el => el._id)
            }
          ],
          from: {
            warehouse_id: centralId
          },
          to: {
            warehouse_id: hubId
          },
          status_list: [{
            agent_id: mongoose.Types.ObjectId(),
            status: _const.ORDER_STATUS.Delivered,
            is_processed: true,
            timeStamp: new Date()
          }],
          delivered_evidence: 'abcd',
          delivery_agent: deliveryAgents[0].aid,
          start: Date(2010, 11, 16),
          end: Date(2010, 11, 19)
        },
      ];

    } catch (err) {
      console.log('Error in beforeEach: ', err);
      done();
    }
  }, 10000);

  it("Sales manager should get all delivery items", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/0/10`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: '',
          isInternal: '',
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.length).toBe(5);

      const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

      const returnedDelivery = res.find(el => el._id.toString() === deliveries[3]._id.toString());
      expect(returnedDelivery.orders.map(el => el._id.toString())).toContain(deliveries[3].order_details[0].order_id.toString());
      expect(returnedDelivery.is_return).toBe(true);

      const fromCentral = res.find(el => el._id.toString() === deliveries[4]._id.toString());
      expect(fromCentral.orders.map(el => el._id.toString())).toContain(deliveries[4].order_details[0].order_id.toString());
      expect(fromCentral.delivery_agent_name).toBe(agentDetails.firstname + ' ' + agentDetails.surname);

      const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
      expect(toWarehouse.orders.map(el => el._id.toString())).toContain(deliveries[2].order_details[0].order_id.toString());
      expect(toWarehouse.delivery_agent_name).toBe(agentDetails.firstname + ' ' + agentDetails.surname);

      const toCustomer = res.find(el => el._id.toString() === deliveries[1]._id.toString());
      expect(toCustomer.orders.map(el => el._id.toString())).toContain(deliveries[1].order_details[0].order_id.toString());

      const fromWarehouse = res.find(el => el._id.toString() === deliveries[0]._id.toString());
      expect(fromWarehouse.orders.map(el => el._id.toString())).toContain(deliveries[0].order_details[0].order_id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this);
    }
  });

  it("Sales manager should get deliveries based on offset and limit", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/2/3`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: '',
          isInternal: '',
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.length).toBe(2);

      const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

      const toCustomer = res.find(el => el._id.toString() === deliveries[1]._id.toString());
      expect(toCustomer.orders.map(el => el._id.toString())).toContain(deliveries[1].order_details[0].order_id.toString());

      const fromWarehouse = res.find(el => el._id.toString() === deliveries[0]._id.toString());
      expect(fromWarehouse.orders.map(el => el._id.toString())).toContain(deliveries[0].order_details[0].order_id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this);
    }
  })

  it("Sales manager should get only returned deliveries", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/0/1`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: true,
          isInternal: false,
          isReturned: true,
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.length).toBe(1);

      const agentDetails = (await models()['AgentTest'].findOne({_id: deliveryAgents[0].aid}));

      const returnedDelivery = res.find(el => el._id.toString() === deliveries[4]._id.toString());
      expect(returnedDelivery.orders.map(el => el._id.toString())).toContain(deliveries[4].order_details[0].order_id.toString());
      expect(returnedDelivery.is_return).toBe(true);
      expect(returnedDelivery.delivered_evidence).toBe(deliveries[4].delivered_evidence);
      expect(returnedDelivery.delivery_agent_name).toBe(agentDetails.firstname + ' ' + agentDetails.surname);

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this);
    }
  });

  it("Shop clerk should get delivery items sent from current shop", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/0/1`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: '',
          isInternal: '',
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.length).toBe(1);

      const fromWarehouse = res.find(el => el._id.toString() === deliveries[0]._id.toString());
      expect(fromWarehouse.orders.map(el => el._id.toString())).toContain(deliveries[0].order_details[0].order_id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this);
    }
  });

  it("Hub clerk should get delivery items sent from hub", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/0/10`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: '',
          isInternal: '',
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.length).toBe(2);

      const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
      expect(toWarehouse.orders.map(el => el._id.toString())).toContain(deliveries[2].order_details[0].order_id.toString());
      expect(toWarehouse.delivery_agent_name).toBe(agentDetails.firstname + ' ' + agentDetails.surname);

      const toCustomer = res.find(el => el._id.toString() === deliveries[1]._id.toString());
      expect(toCustomer.orders.map(el => el._id.toString())).toContain(deliveries[1].order_details[0].order_id.toString());
      
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this);
    }
  });

  it("Hub clerk should get delivery items sent between two specified dates", async function (done) {
    this.done = done;

    try {
      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`delivery/items/0/10`),
        body: {
          sort_column: '',
          agentName: '',
          transferee: '',
          direction: '',
          endDate: '',
          isDelivered: '',
          isInternal: '',
          start_date: Date(2010, 10, 12),
          end_date: Date(2010, 10, 20)
        },
        jar: salesManager.rpJar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);

      res = res.body;

      expect(res.length).toBe(1);

      const toWarehouse = res.find(el => el._id.toString() === deliveries[2]._id.toString());
      expect(toWarehouse.orders.map(el => el._id.toString())).toContain(deliveries[2].order_details[0].order_id.toString());
      expect(toWarehouse.delivery_agent_name).toBe(agentDetails.firstname + ' ' + agentDetails.surname);
      
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this);
    }
  });
});

describe("Delivery POST API", () => {
  let deliveryAgents = [], deliveries = [], orders = [];

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
        const address = {
          _id: mongoose.Types.ObjectId(),
          province: 'Tehran',
          city: 'Tehran',
          street: 'Zafar'
        };
        const ticket = {
          status: _const.ORDER_STATUS.DeliverySet,
          desc: "descccc",
          timeStamp: new Date(),
          is_processed: false,
          referral_advice: 1123,
          agent_id: mongoose.Types.ObjectId()
        };

        return models()['OrderTest'].insertMany([
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }, {
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }, {
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }, {
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
          {
            _id: mongoose.Types.ObjectId(),
            customer_id: customerId,
            address: address,
            order_lines: [{
              _id: mongoose.Types.ObjectId(),
              tickets: [ticket],
              product_id: mongoose.Types.ObjectId(),
              product_instance_id: mongoose.Types.ObjectId(),
            }],
            adding_time: new Date(),
          },
        ]);
      })
      .then(res => {
        orders = res;

        const hubId = warehouses.find(el => el.is_hub)._id;
        deliveryStatus = {
          agent_id: mongoose.Types.ObjectId(),
          status: _const.ORDER_STATUS.DeliverySet,
          is_processed: false,
          timeStamp: new Date()
        }

        deliveries = [
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[0]._id,
                order_line_ids: orders[0].order_lines.map(el => el._id)
              },
              {
                order_id: orders[1]._id,
                order_line_ids: orders[0].order_lines.map(el => el._id)
              }
            ],
            status_list: [deliveryStatus],
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[2]._id,
                order_line_ids: orders[2].order_lines.map(el => el._id)
              }
            ],
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            status_list: [deliveryStatus],
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[3]._id,
                order_line_ids: orders[3].order_lines.map(el => el._id)
              },
            ],
            from: {
              warehouse_id: hubId
            },
            to: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            delivery_agent: deliveryAgents[0].aid,
            status_list: [deliveryStatus],
            start: Date(2010, 10, 10),
            end: Date(2010, 10, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[4]._id,
                order_line_ids: orders[4].order_lines.map(el => el._id)
              }
            ],
            from: {
              customer: {
                id: orders[4].customer_id,
                address_id: orders[4].address._id,
              }
            },
            to: {
              warehouse_id: hubId
            },
            is_return: true,
            status_list: [deliveryStatus],
            start: Date(2010, 11, 10),
            end: Date(2010, 11, 15)
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orders[5]._id,
                order_line_ids: orders[5].order_lines.map(el => el._id)
              }
            ],
            from: {
              customer: {
                id: orders[0].customer_id,
                address_id: orders[0].address._id,
              }
            },
            to: {
              warehouse_id: hubId
            },
            is_return: true,
            status_list: [deliveryStatus],
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
        // res.map(el => el.status_list[el.status_list.length - 1]).reduce((a, b) => a.concat(b), []).forEach(t => {
          // expect(t.status).toBe(_const.ORDER_STATUS.ReadyToDeliver);
        // });

      //   return models()['OrderTest'].find({
      //     _id: {
      //       $in: [orders[0]._id, orders[1]._id, orders[4]._id]
      //     }
      //   });
      // })
      // .then(res => {
      //   expect(res.length).toBe(3);
      //   expect(res
      //     .map(el => el.order_lines.map(i => i.tickets[i.tickets.length - 1])
      //       .reduce((a, b) => a.concat(b), []))
      //     .reduce((a, b) => a.concat(b), [])
      //     .map(el => el.status)).toContain(_const.ORDER_STATUS.ReadyToDeliver);
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
      //   return models()['OrderTest'].find({
      //     _id: {
      //       $in: [orders[0]._id, orders[1]._id, orders[2]._id, orders[3]._id]
      //     }
      //   });
      // })
      // .then(res => {
      //   expect(res.length).toBe(4);
      //   expect(res
      //     .map(el => el.order_lines.map(i => i.tickets[i.tickets.length - 1])
      //       .reduce((a, b) => a.concat(b), []))
      //     .reduce((a, b) => a.concat(b), [])
      //     .map(el => el.status)).toContain(_const.ORDER_STATUS.ReadyToDeliver);
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

  it("Delivery agent should unassign multiple delivery items", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
        delivery_ids: [deliveries[2]._id, deliveries[4]._id]
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
        expect(res.length).toBe(0);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should do nothing when delivery_ids is empty (unassigning the delivery)", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
        delivery_ids: []
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
        expect(res.length).toBe(2);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("Should get error when there is a delivery with another agent responsibility", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
        delivery_ids: [deliveries[2]._id]
      },
      jar: deliveryAgents[1].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Another delivery agent can unassign delivery with another one responsibility');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.notDeliveryResponsibility.status);
        expect(err.error).toBe(errors.notDeliveryResponsibility.message);
        done();
      });
  });

  it("Should get error when passed data is incomplete for unassinging", function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`/delivery/unassign`),
      body: {
      },
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Delivery agent can unassign delivery with incomplete data');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(errors.dataIsNotCompleted.status);
        expect(err.error).toBe(errors.dataIsNotCompleted.message);
        done();
      });
  });
});