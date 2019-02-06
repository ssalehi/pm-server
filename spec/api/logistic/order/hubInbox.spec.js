const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const utils = require('../utils');
const moment = require('moment');

describe('POST Search on Shelve List', () => {

  let orders, products, deliveries;
  let hubClerk = {
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

      const hub = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hubWarehouse._id);
      hubClerk.aid = hub.aid;
      hubClerk.jar = hub.rpJar;

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
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.default,
            receiver_id: hubWarehouse._id,
            timestamp: new Date()
          }],
          shelf_code: 'A',
          delivery_agent: agentObj.aid,
          delivery_start: moment().toDate(),
          delivery_end: moment().add(1, 'd').toDate()
        },
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);

  it('should see order in shelf code', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'ShelvesList'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: hubClerk.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    done();

  });
});


describe('POST Order Ticket Scan - hub inbox scan', () => {
  let orders, products;
  let hubClerk = {
    aid: null,
    jar: null,
  };
  customer = {
    _id: null,
    jar: null,
  }


  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll()
      await models()['WarehouseTest'].insertMany(warehouses)
      hub = warehouses.find(x => x.is_hub);
      const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
      hubClerk.aid = agent.aid;
      hubClerk.jar = agent.rpJar;
      const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
        first_name: 'Sareh',
        surname: 'Salehi'
      })
      customer._id = customerobj.cid,
        customer.jar = customerobj.jar
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
              receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
              desc: null,
              timestamp: new Date(),
            }]
          }
        }
      });
      await models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(orders[3]._id),
      }, {
        $set: {
          order_lines: {
            product_id: mongoose.Types.ObjectId(products[0]._id),
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: mongoose.Types.ObjectId(products[0].instances[1]._id),
            tickets: [{
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.Delivered,
              receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
              desc: null,
              timestamp: new Date(),
            }]
          }
        }
      });
      done()
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);
  it('should scan product barcode and change its ticket to recieved and initiates delivery with logged in customer address', async function (done) {
    try {
      this.done = done
      const res = await rp({
        jar: hubClerk.jar,
        body: {
          trigger: _const.SCAN_TRIGGER.Inbox,
          orderId: orders[0]._id,
          barcode: '0394081341'
        },
        method: 'POST',
        json: true,
        uri: lib.helpers.apiTestURL('order/ticket/scan'),
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200)
      const deliveryData = await models()['DeliveryTest'].find()
      const orderData = await models()['OrderTest'].find()
      is_exist = deliveryData.find(delivery => delivery.to.customer._id).order_details[0].order_line_ids.map(id => id.toString()).includes(orderData[0].order_lines[0]._id.toString())
      newOLTicketStatus = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1].status
      expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.Recieved)
      expect(orderData[0].tickets[orderData[0].tickets.length - 1].status).toBe(_const.ORDER_STATUS.DeliverySet)
      expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.default)
      expect(is_exist).toBe(true)
      done()
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
    ;
  });
  it('should scan product barcode and change its ticket to recieved and initiates delivery with guest customer address', async function (done) {
    try {
      this.done = done
      const res = await rp({
        jar: hubClerk.jar,
        body: {
          trigger: _const.SCAN_TRIGGER.Inbox,
          orderId: orders[3]._id,
          barcode: '0394081342'
        },
        method: 'POST',
        json: true,
        uri: lib.helpers.apiTestURL('order/ticket/scan'),
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200)
      const deliveryData = await models()['DeliveryTest'].find()
      const delivery = deliveryData.find(delivery => !delivery.to.warehouse_id && !delivery.to.customer._id)
      const orderData = await models()['OrderTest'].find()
      const order = orderData.find(o => !o.customer_id && o.address && !o.is_collect)
      is_exist = delivery.order_details[0].order_line_ids.map(id => id.toString()).includes(order.order_lines[0]._id.toString())
      newOLTicketStatus = order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status
      expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.Recieved)
      expect(delivery.to.customer.address.province).toBe(order.address.province)
      expect(order.tickets[order.tickets.length - 1].status).toBe(_const.ORDER_STATUS.DeliverySet)
      expect(delivery.tickets[delivery.tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.default)
      expect(is_exist).toBe(true)
      done()
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
    ;
  });
});
describe('POST onlineWarehouseResponse(cancel)', () => {
  let orders, products
  let hubClerk = {
    aid: null,
    jar: null,
  };
  let customer = {
    cid: null,
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
              status: _const.ORDER_LINE_STATUS.Delivered,
              desc: null,
              receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
              timestamp: new Date(),
            }]
          }]
        }
      });
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
        trigger: _const.SCAN_TRIGGER.Inbox,
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
    expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.DeliverySet)
    NdeliveryData = await models()['DeliveryTest'].find()
    expect(NdeliveryData.length).toBe(1)
    expect(NdeliveryData[0].to.warehouse_id.toString()).toBe(warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id.toString())
    done()
  });
});