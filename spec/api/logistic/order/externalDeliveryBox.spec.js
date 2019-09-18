const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');
const utils = require('../utils');

describe('POST Search ScanExternalDeliveryBox', () => {

  let palladiumClerk = {
    aid: null,
    jar: null
  };

  let hubClerk = {
    aid: null,
    jar: null
  };

  let products, hubWarehouse, palladiumWarehouse;
  beforeEach(async (done) => {
    try {

      await lib.dbHelpers.dropAll();

      let warehouse = await models()['WarehouseTest'].insertMany(warehouses);
      warehouse = JSON.parse(JSON.stringify(warehouse));

      hubWarehouse = warehouse.find(x => x.is_hub && !x.has_customer_pickup);

      palladiumWarehouse = warehouse.find(x => !x.is_hub && x.priority === 1);

      let res1 = await lib.dbHelpers.addAndLoginAgent('hubclerk', _const.ACCESS_LEVEL.HubClerk, hubWarehouse._id);
      hubClerk.aid = res1.aid;
      hubClerk.jar = res1.rpJar;

      let res2 = await lib.dbHelpers.addAndLoginAgent('pclerk', _const.ACCESS_LEVEL.ShopClerk, palladiumWarehouse._id);
      palladiumClerk.aid = res2.aid;
      palladiumClerk.jar = res2.rpJar;


      products = await models()['ProductTest'].insertMany([
        {
          name: 'sample 1',
          base_price: 30000,
          article_no: "ar123",
          instances: [
            {
              size: "9",
              price: 2000,
              barcode: '0394081341',
            },
            {
              size: "10",
              price: 2000,
              barcode: '0394081342',
            }
          ]
        }
      ]);

      done()
    }
    catch (err) {
      console.log(err);
    }
  }, 15000);

  it('should get cc order lines which is in its destination', async function (done) {
    try {
      this.done = done;

      let orders = [];

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12213",
        order_lines: [],
        is_collect: true,
        order_time: moment(),
        address: {
          _id: mongoose.Types.ObjectId(),
          city: "تهران",
          street: "مقدس اردبیلی",
          province: "تهران",
          warehouse_name: "پالادیوم",
          warehouse_id: palladiumWarehouse._id,
          recipient_first_name: "s",
          recipient_surname: "v",
          recipient_national_id: "8798789798",
          recipient_mobile_no: "09124077685",
        },
        tickets: [
          {
            is_processed: false,
            status: _const.ORDER_STATUS.ReadyToDeliver,
            desc: null,
            receiver_id: palladiumWarehouse._id,
            timestamp: moment()
          }
        ]
      });

      for (let i = 0; i < 3; i++) { // add 3 order line of first product for order 1
        orders[0].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[0].id,
          adding_time: moment(),
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.FinalCheck,
              desc: null,
              receiver_id: palladiumWarehouse._id,
              timestamp: moment()
            }
          ]
        })
      }
      for (let i = 0; i < 2; i++) { // add 2 order line of second product instance for order 1
        orders[0].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[1].id,
          adding_time: moment(),
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.Recieved,
              desc: null,
              receiver_id: palladiumWarehouse._id,
              timestamp: moment()
            }
          ]
        })
      }

      orders = await models()['OrderTest'].insertMany(orders);
      orders = JSON.parse(JSON.stringify(orders));

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`search/Ticket`),
        body: {
          options: {
            type: 'ScanToCustomerDelivery',
          },
          offset: 0,
          limit: 10,
        },
        json: true,
        jar: palladiumClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].total_order_lines).toBe(5);
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

});

describe('External Unassigned Delivery in App', () => {

  let orders, products, deliveries;
  let agentObj = {
    aid: null,
    jar: null
  };

  let customer = {
    _id: null,
    jar: null,
  };

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
      agentObj.aid = agent.aid;
      agentObj.jar = agent.rpJar;
      await models()['WarehouseTest'].insertMany(warehouses);

      const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
        first_name: 'S',
        surname: 'V'
      });
      customer._id = customerobj.cid;
      customer.jar = customerobj.jar;

      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer);
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[0]._id),
      }, {
        $set: {
          order_lines: {
            product_id: mongoose.Types.ObjectId(products[0]._id),
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.Delivered,
              desc: null,
              receiver_id: warehouses.find(x => x.is_hub)._id,
              timestamp: new Date()
            }]
          },
          tickets: [{
            is_processed: false,
            status: _const.ORDER_STATUS.DeliverySet,
            desc: null,
            receiver_id: mongoose.Types.ObjectId(),
            timestamp: new Date()
          }]
        }
      });
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[1]._id),
      }, {
        $set: {
          order_lines: {
            product_id: mongoose.Types.ObjectId(products[0]._id),
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.ReturnRequested,
              desc: null,
              receiver_id: customerobj._id,
              timestamp: new Date()
            }]
          },
          tickets: [{
            is_processed: false,
            status: _const.ORDER_STATUS.Delivered,
            desc: null,
            receiver_id: customerobj._id,
            timestamp: new Date()
          }]
        }
      });
      const orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([
        {
          to: {
            customer: {
              _id: orderData[0].customer_id,
              address: orderData[0].address
            }
          },
          from: {
            warehouse_id: warehouses.find(x => x.is_hub)._id
          },
          order_details: [{
            order_line_ids: [
              orderData[0].order_lines[0]._id,
            ],
            _id: mongoose.Types.ObjectId(),
            order_id: orders[0]._id
          }],
          start: new Date(),
          slot: [{
            lower_bound: 18,
            upper_bound: 22
          }],
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.agentSet,
            receiver_id: agentObj.aid,
            timestamp: new Date()
          }],
          shelf_code: "A",
        },
        {
          to: {
            warehouse_id: warehouses.find(x => x.is_hub)._id
          },
          from: {
            customer: {
              _id: orderData[1].customer_id,
              address: orderData[1].address
            }
          },

          order_details: [{
            order_line_ids: [
              orderData[1].order_lines[0]._id,
            ],
            _id: mongoose.Types.ObjectId(),
            order_id: orders[1]._id
          }],
          start: new Date(),
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.agentSet,
            receiver_id: agentObj._id,
            timestamp: new Date()
          }],
        }
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);


  it('should see delivery from hub to customer', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'ExternalUnassignedDelivery'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: agentObj.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    done();
  });

  it('should see delivery return from customer to hub', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'ExternalUnassignedDelivery'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: agentObj.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    done();
  });

});

describe('On Delivery in App', () => {

  let orders, products, deliveries;
  let agentObj = {
    aid: null,
    jar: null
  };

  let customer = {
    _id: null,
    jar: null,
  };

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
      agentObj.aid = agent.aid;
      agentObj.jar = agent.rpJar;
      await models()['WarehouseTest'].insertMany(warehouses);

      const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
        first_name: 'S',
        surname: 'V'
      });
      customer._id = customerobj.cid;
      customer.jar = customerobj.jar;

      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer);
      await models()['OrderTest'].updateMany({
        _id: mongoose.Types.ObjectId(orders[0]._id),
      }, {
        $set: {
          order_lines: {
            product_id: mongoose.Types.ObjectId(products[0]._id),
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.Delivered,
              desc: null,
              receiver_id: warehouses.find(x => x.is_hub)._id,
              timestamp: new Date()
            }]
          },
          tickets: [{
            is_processed: false,
            status: _const.ORDER_STATUS.Delivered,
            desc: null,
            receiver_id: mongoose.Types.ObjectId(),
            timestamp: new Date()
          }]
        }
      });
      const orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([
        {
          to: {
            warehouse_id: warehouses.find(x => x.is_hub)._id
          },
          from: {
            customer: {
              _id: orderData[0].customer_id,
              address: orderData[0].address
            }
          },
          order_details: [{
            order_line_ids: [
              orderData[0].order_lines[0]._id,
            ],
            _id: mongoose.Types.ObjectId(),
            order_id: orders[0]._id

          }],
          start: new Date(),
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.started,
            receiver_id: agentObj.aid,
            timestamp: new Date()
          }],
          delivery_agent: agentObj.aid,
          delivery_start: new Date(),
        },
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);


  it('should see delivery started', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'OnDelivery'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: agentObj.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    done();

  });

});

describe('AgentFinishedDelivery in App', () => {

  let orders, products, deliveries;
  let agentObj = {
    aid: null,
    jar: null
  };

  let customer = {
    _id: null,
    jar: null,
  };

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
      agentObj.aid = agent.aid;
      agentObj.jar = agent.rpJar;
      await models()['WarehouseTest'].insertMany(warehouses);

      const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
        first_name: 'S',
        surname: 'V'
      });
      customer._id = customerobj.cid;
      customer.jar = customerobj.jar;

      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer);
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[0]._id),
      }, {
        $set: {
          order_lines: {
            product_id: mongoose.Types.ObjectId(products[0]._id),
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.Delivered,
              desc: null,
              receiver_id: warehouses.find(x => x.is_hub)._id,
              timestamp: new Date()
            }]
          },
          tickets: [{
            is_processed: false,
            status: _const.ORDER_STATUS.Delivered,
            desc: null,
            receiver_id: agentObj._id,
            timestamp: new Date()
          }]
        }
      });
      const orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([
        {
          to: {
            warehouse_id: warehouses.find(x => x.is_hub)._id
          },
          from: {
            customer: {
              _id: orderData[0].customer_id,
              address: orderData[0].address
            }
          },
          order_details: [{
            order_line_ids: [
              orderData[0].order_lines[0]._id,
            ],
            _id: mongoose.Types.ObjectId(),
            order_id: orders[0]._id

          }],
          start: new Date(),
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.ended,
            receiver_id: warehouses.find(x => x.is_hub)._id,
            timestamp: new Date()
          }],
          delivery_agent: agentObj.aid,
          delivery_start: moment().toDate(),
          delivery_end: moment().add(1, 'd').toDate()
        },
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);


  it('should see delivery ended', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'AgentFinishedDelivery'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: agentObj.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    done();

  });

});
