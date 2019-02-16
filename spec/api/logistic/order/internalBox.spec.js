const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const moment = require('moment');
const utils = require('../utils');

describe('POST Order Ticket Scan performed by hub and shop clerk- send internal', () => {
  let orders, products, customer;
  ShopClerk = {
    aid: null,
    jar: null,
  }
  internalagent = {
    aid: null,
    jar: null
  }
  customer = {
    _id: null,
    jar: null,
  }
  let hubClerk = {
    aid: null,
    jar: null,
  };
  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll()
      await models()['WarehouseTest'].insertMany(warehouses)
      const Iagent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
      internalagent.aid = Iagent.aid
      hub = warehouses.find(x => x.is_hub);
      const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
      hubClerk.aid = agent.aid;
      hubClerk.jar = agent.rpJar;
      const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => x.name === 'سانا')._id)
      ShopClerk.aid = sclerck.aid;
      ShopClerk.jar = sclerck.rpJar
      const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
        first_name: 'Sareh',
        surname: 'Salehi'
      })
      customer._id = customerobj.cid,
        customer.jar = customerobj.jar
      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer)
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[1]._id),
      }, {
        $set: {
          order_lines: {
            product_id: products[0]._id,
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: products[0].instances[0]._id,
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.FinalCheck,
              receiver_id: warehouses.find(x => x.name === 'سانا')._id,
              desc: null,
              timestamp: new Date(),
            }]
          }
        }
      });
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[4]._id),
      }, {
        $set: {
          order_lines: {
            product_id: products[0]._id,
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: products[0].instances[0]._id,
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.FinalCheck,
              receiver_id: warehouses.find(x => x.is_hub)._id,
              desc: null,
              timestamp: new Date(),
            }]
          },
          address: {
            warehouse_id: warehouses.find(x => x.name === 'سانا')._id
          }
        }
      });
      const orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([{ // delivery 0 => internal delivery to hub
        to: {
          warehouse_id: warehouses.find(x => x.is_hub)._id

        },
        from: {
          warehouse_id: warehouses.find(x => x.name === 'سانا')._id

        },
        order_details: [{
          order_line_ids: [
            orderData[1].order_lines[0]._id
          ],
          order_id: orders[1]._id
        }],
        start: new Date(),
        delivery_agent: {
          _id: internalagent.aid
        },
        tickets: [{
          is_processed: false,
          status: _const.DELIVERY_STATUS.default,
          receiver_id: warehouses.find(x => x.is_hub)._id,
          timestamp: new Date()
        }],
        "__v": 0
      }, { // delivery 1 => internal delivery to shop
        to: {
          warehouse_id: warehouses.find(x => x.name === 'سانا')._id
        },
        from: {

          warehouse_id: warehouses.find(x => x.is_hub)._id

        },
        order_details: [{
          order_line_ids: [
            orderData[4].order_lines[0]._id
          ],
          order_id: orders[4]._id
        }],
        start: new Date(),
        delivery_agent: {
          _id: internalagent.aid
        },
        tickets: [{
          is_processed: false,
          status: _const.DELIVERY_STATUS.default,
          receiver_id: warehouses.find(x => x.name === 'سانا')._id,
          timestamp: new Date()
        }],
        "__v": 0
      }]);
      done();
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);
  it('should scan product in shop barcode for internal send and change OL ticket to ReadyToDeliver', async function (done) {
    try {
      this.done = done
      const res = await rp({
        jar: ShopClerk.jar,
        body: {
          trigger: _const.SCAN_TRIGGER.SendInternal,
          orderId: orders[1]._id,
          barcode: '0394081341'
        },
        method: 'POST',
        json: true,
        uri: lib.helpers.apiTestURL('order/ticket/scan'),
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200)
      const orderData = await models()['OrderTest'].find()
      const order = orderData.find(o => o.customer_id && o.order_lines.length)
      newOLTicketStatus = order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status
      expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.ReadyToDeliver)
      const deliveryData = await models()['DeliveryTest'].find()
      expect(deliveryData[0].tickets[0].receiver_id.toString()).toBe(warehouses.find(x => x.is_hub)._id.toString())

      done()
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
    ;
  });
  it('should scan product  barcode in hub for internal send (C&C mostly) and change OL ticket to ReadyToDeliver', async function (done) {
    try {
      this.done = done

      const res = await rp({
        jar: hubClerk.jar,
        body: {
          trigger: _const.SCAN_TRIGGER.SendInternal,
          orderId: orders[4]._id,
          barcode: '0394081341'
        },
        method: 'POST',
        json: true,
        uri: lib.helpers.apiTestURL('order/ticket/scan'),
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200)
      const orderData = await models()['OrderTest'].find()
      const order = orderData.find(o => o.is_collect && o.order_lines.length)
      newOLTicketStatus = order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status
      expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.ReadyToDeliver)
      const deliveryData = await models()['DeliveryTest'].find()
      expect(deliveryData[1].tickets[0].receiver_id.toString()).toBe(warehouses.find(x => x.name === 'سانا')._id.toString())
      done()
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
    ;
  });
});
describe('POST scan for return delivery', () => {
  let orders, products
  let hubClerk = {
    aid: null,
    jar: null,
  };
  let customer = {
    cid: null,
    jar: null
  }
  internalagent = {
    aid: null,
    jar: null
  }
  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll()

      await models()['WarehouseTest'].insertMany(warehouses)
      let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
        first_name: 'test 1',
        surname: 'test 1',
      });
      customer.cid = res.cid;
      customer.jar = res.rpJar;
      hub = warehouses.find(x => x.is_hub);
      const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
      hubClerk.aid = agent.aid;
      hubClerk.jar = agent.rpJar;
      const Iagent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
      internalagent.aid = Iagent.aid
      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer);
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[0]._id),
      }, {
        $set: {
          order_lines: [{
            cancel: true,
            product_id: products[0]._id,
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: products[0].instances[0]._id,
            tickets: [{
              is_processed: false,
              _id: mongoose.Types.ObjectId(),
              status: _const.ORDER_LINE_STATUS.FinalCheck,
              desc: null,
              receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
              timestamp: new Date(),
            }]
          }]
        }
      });
      orderData = await models()['OrderTest'].find()
      deliveries = await models()['DeliveryTest'].insertMany([{ // delivery 0 => internal delivery to hub
        to: {
          warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id

        },
        from: {
          warehouse_id: warehouses.find(x => x.is_hub)._id

        },
        order_details: [{
          order_line_ids: [
            orderData[0].order_lines[0]._id
          ],
          order_id: orders[0]._id
        }],
        start: new Date(),
        delivery_agent: {
          _id: internalagent.aid
        },
        tickets: [{
          is_processed: false,
          status: _const.DELIVERY_STATUS.default,
          receiver_id: warehouses.find(x => x.is_hub)._id,
          timestamp: new Date()
        }],
        "__v": 0
      }])
      orderData = await models()['OrderTest'].find()
      done()
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);

  it('after scan create orderlines delivery back to centralwarehouse', async function (done) {
    this.done = done
    const res = await rp({
      jar: hubClerk.jar,
      body: {
        trigger: _const.SCAN_TRIGGER.ReturnDelivery,
        orderId: orders[0]._id,
        barcode: '0394081341'
      },
      method: 'POST',
      json: true,
      uri: lib.helpers.apiTestURL('order/ticket/scan'),
      resolveWithFullResponse: true
    })
    expect(res.statusCode).toBe(200)
    NorderData = await models()['OrderTest'].find()
    expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.ReadyToDeliver)
    NdeliveryData = await models()['DeliveryTest'].find()
    expect(NdeliveryData.length).toBe(1)
    expect(NdeliveryData[0].to.warehouse_id.toString()).toBe(warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id.toString())
    done()
  });
});