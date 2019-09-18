const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const utils = require('../utils');
const moment = require('moment');

describe('POST Search on Delivery Items', () => {

  let orders, products, deliveries;
  let salesManager = {
    aid: null,
    jar: null
  };

  let hubClerk = {
    aid: null,
    jar: null
  };

  let palladiumClerk = {
    aid: null,
    jar: null
  };

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

      await models()['WarehouseTest'].insertMany(warehouses);

      let hubWarehouse = warehouses.find(x => x.is_hub && !x.has_customer_pickup);
      let centralWarehouse = warehouses.find(x => !x.is_hub && !x.has_customer_pickup);
      let palladiumWarehouse = warehouses.find(x => !x.is_hub && x.priority === 1);

      let res1 = await lib.dbHelpers.addAndLoginAgent('salesManager', _const.ACCESS_LEVEL.SalesManager, centralWarehouse._id);
      salesManager.aid = res1.aid;
      salesManager.jar = res1.rpJar;

      const hub = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hubWarehouse._id);
      hubClerk.aid = hub.aid;
      hubClerk.jar = hub.rpJar;

      let res2 = await lib.dbHelpers.addAndLoginAgent('pclerk', _const.ACCESS_LEVEL.ShopClerk, palladiumWarehouse._id);
      palladiumClerk.aid = res2.aid;
      palladiumClerk.jar = res2.rpJar;

      const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent);
      agentObj.aid = agent.aid;
      agentObj.jar = agent.rpJar;

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
            tickets: []
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
            tickets: []
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
      const orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([
        { // hub to customer
          to: {
            customer: {
              _id: orderData[0].customer_id,
              address: orderData[0].address
            }
          },
          from: {
            warehouse_id: hubWarehouse._id
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
            status: _const.DELIVERY_STATUS.default,
            receiver_id: hubWarehouse._id,
            timestamp: new Date()
          }],
          delivery_agent: agentObj.aid,
          delivery_start: moment().toDate(),
          delivery_end: moment().add(1, 'd').toDate()
        },
        { // internal delivery
          to: {
            warehouse_id: hubWarehouse._id
          },
          from: {
            warehouse_id: palladiumWarehouse._id
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
            status: _const.DELIVERY_STATUS.default,
            receiver_id: hubWarehouse._id,
            timestamp: new Date()
          }],
          delivery_agent: agentObj.aid,
          delivery_start: moment().toDate(),
          delivery_end: moment().add(1, 'd').toDate()
        },
        {  // from customer to hub
          from: {
            customer: {
              _id: orderData[0].customer_id,
              address: orderData[0].address
            }
          },
          to: {
            warehouse_id: hubWarehouse._id
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
            receiver_id: hubWarehouse._id,
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

  it('sales manager should see all deliveries history', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'DeliveryHistory'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: salesManager.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(3);
    done();

  });
});

describe('POST Search - Sales Manager Inbox', () => {

  let orders, products, deliveries, SMMessage;
  let salesManager = {
    aid: null,
    jar: null
  };

  let hubClerk = {
    aid: null,
    jar: null
  };

  let palladiumClerk = {
    aid: null,
    jar: null
  };

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

      await models()['WarehouseTest'].insertMany(warehouses);

      let hubWarehouse = warehouses.find(x => x.is_hub && !x.has_customer_pickup);
      let centralWarehouse = warehouses.find(x => !x.is_hub && !x.has_customer_pickup);
      let palladiumWarehouse = warehouses.find(x => !x.is_hub && x.priority === 1);

      let res1 = await lib.dbHelpers.addAndLoginAgent('salesManager', _const.ACCESS_LEVEL.SalesManager, centralWarehouse._id);
      salesManager.aid = res1.aid;
      salesManager.jar = res1.rpJar;

      const hub = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hubWarehouse._id);
      hubClerk.aid = hub.aid;
      hubClerk.jar = hub.rpJar;

      let res2 = await lib.dbHelpers.addAndLoginAgent('pclerk', _const.ACCESS_LEVEL.ShopClerk, palladiumWarehouse._id);
      palladiumClerk.aid = res2.aid;
      palladiumClerk.jar = res2.rpJar;

      const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent);
      agentObj.aid = agent.aid;
      agentObj.jar = agent.rpJar;

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
          order_lines: [{
            product_id: mongoose.Types.ObjectId(products[0]._id),
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
            tickets: []
          },
            {
              product_id: mongoose.Types.ObjectId(products[0]._id),
              campaign_info: {
                _id: mongoose.Types.ObjectId(),
                discount_ref: 0
              },
              product_instance_id: mongoose.Types.ObjectId(products[0].instances[1]._id),
              tickets: []
            }],
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
            tickets: []
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
      const orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([
        {
          from: {
            customer: {
              _id: orderData[0].customer_id,
              address: orderData[0].address
            }
          },
          to: {
            warehouse_id: hubWarehouse._id
          },
          order_details: [{
            order_line_ids: [
              orderData[0].order_lines[0]._id,
              orderData[0].order_lines[1]._id,
            ],
            _id: mongoose.Types.ObjectId(),
            order_id: orders[0]._id

          }],
          start: new Date(),
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.default,
            receiver_id: hubWarehouse._id,
            timestamp: new Date()
          }],
          delivery_agent: agentObj.aid,
          delivery_start: moment().toDate(),
          delivery_end: moment().add(1, 'd').toDate()
        },

      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));

      SMMessage = await models()['SMMessageTest'].insertMany([
        {
          is_processed: false,
          is_closed: false,
          type: 1,
          order_id: orders[0]._id,
          order_line_id: orderData[0].order_lines[0]._id,
          extra: {
            address_id: orderData[0].address._id
          },
          publish_date: moment(),
          close_date: moment().add(1, 'd').toDate(),
        },
        {
          is_processed: true,
          is_closed: true,
          type: 1,
          order_id: orders[0]._id,
          order_line_id: orderData[0].order_lines[1]._id,
          extra: {
            address_id: orderData[0].address._id
          },
          publish_date: moment(),
          close_date: moment().add(1, 'd').toDate(),
          report: "test"
        }
      ]);
      SMMessage = JSON.parse(JSON.stringify(SMMessage));
      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);

  it('should sales manager see return orders', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/SMMessage'),
      method: 'POST',
      body: {
        options: {
          type: 'SMInbox'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: salesManager.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    done();

  });

  it('should sales manager see return orders history', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/SMMessage'),
      method: 'POST',
      body: {
        options: {
          type: 'SMHistory'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: salesManager.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);

    done();

  });

});

describe('POST Search OrderHistory', () => {

  let salesManager = {
    aid: null,
    jar: null
  };

  let hubClerk = {
    aid: null,
    jar: null
  };

  let products, centralWarehouse, hubWarehouse;
  beforeEach(async (done) => {
    try {

      await lib.dbHelpers.dropAll();

      let warehouse = await models()['WarehouseTest'].insertMany(warehouses);
      warehouse = JSON.parse(JSON.stringify(warehouse));

      hubWarehouse = warehouse.find(x => x.is_hub && !x.has_customer_pickup);
      centralWarehouse = warehouse.find(x => !x.is_hub && !x.has_customer_pickup);

      let res1 = await lib.dbHelpers.addAndLoginAgent('salesManager', _const.ACCESS_LEVEL.SalesManager, centralWarehouse._id);
      salesManager.aid = res1.aid;
      salesManager.jar = res1.rpJar;

      let res = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hubWarehouse._id);
      hubClerk.aid = res.aid;
      hubClerk.jar = res.rpJar;

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


  it('only sales manager can see orders', async function (done) {
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
      });

      for (let i = 0; i < 3; i++) { // add 3 order line of first product for order 1
        orders[0].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[0].id,
          adding_time: moment(),
          cancel: false,
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.DeliverySet,
              desc: null,
              receiver_id: hubWarehouse._id,
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
            type: 'OrdersHistory',
          },
          offset: 0,
          limit: 10,
        },
        json: true,
        // jar:
        resolveWithFullResponse: true
      });
      this.fail('only sales manager can see history box');
      done()
    } catch (err) {
      expect(err.statusCode).toBe(403);
      done()
    };
  });

});