const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const deliveryDurationInfo = require('../../../../deliveryDurationInfo')
const utils = require('../utils');

describe('Sales Manager Inbox - not existing order line', () => {
  let orders, products;
  let customer = {
    cid: null,
    jar: null
  };

  let salesManager = {
    aid: null,
    jar: null
  }

  beforeEach(async done => {
    try {

      await lib.dbHelpers.dropAll()

      await models()['DeliveryDurationInfoTest'].insertMany(deliveryDurationInfo)
      await models()['WarehouseTest'].insertMany(warehouses)

      let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
        first_name: 'test 1',
        surname: 'test 1',
        address: utils.loggedInCustomerAddress
      });

      customer.cid = res.cid;
      customer.jar = res.rpJar;

      res = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager);
      salesManager.aid = res.aid;
      salesManager.jar = res.rpJar;

      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer);

      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);

  it('make a not exist message for sales manager when order line cannot be afford in any warehouse ', async function (done) {
    try {
      this.done = done;

      orders[0] = await models()['OrderTest'].findOneAndUpdate({
        _id: orders[0]._id
      }, {
          $set: {
            order_lines: [
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[0]._id,
                tickets: []
              },
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[1]._id,
                tickets: []
              }
            ]
          }

        }, {new: true});


      // clear all inventories for product 0 instance 0
      for (let i = 1; i < warehouses.length; i++) {
        await utils.changeInventory(products[0]._id, products[0].instances[0]._id, warehouses[i]._id, -2, 0);
      }
      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`demoVerifyPayment`),
        body: {
          orderId: orders[0]._id,
        },
        method: 'POST',
        jar: customer.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);

      let foundMessage = await models()['SMMessageTest'].findOne({});
      expect(foundMessage.order_id.toString()).toBe(orders[0]._id.toString());
      expect(foundMessage.order_line_id.toString()).toBe(orders[0].order_lines[0]._id.toString());
      expect(foundMessage.type).toBe(_const.SM_MESSAGE.NotExists);
      expect(foundMessage.extra.hasMoreOrderLines).toBeTruthy();

      let foundOrder = await models()['OrderTest'].findOne({
        _id: orders[0]._id
      });

      let notExistTicket = foundOrder.order_lines[0].tickets[foundOrder.order_lines[0].tickets.length - 1];
      expect(notExistTicket.status).toBe(_const.ORDER_LINE_STATUS.NotExists);
      expect(notExistTicket.receiver_id.toString()).toBe(salesManager.aid.toString());

      let defaultTicket = foundOrder.order_lines[1].tickets[foundOrder.order_lines[1].tickets.length - 1];
      expect(defaultTicket.status).toBe(_const.ORDER_LINE_STATUS.default);
      expect(defaultTicket.receiver_id.toString()).toBe(warehouses[1]._id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });

  it('tests sales manager action when he cancels only not existing order line', async function (done) {
    try {
      this.done = done;

      orders[0] = await models()['OrderTest'].findOneAndUpdate({
        _id: orders[0]._id
      }, {
          $set: {
            order_lines: [
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[0]._id,
                tickets: [
                  {
                    is_processed: false,
                    status: 13,
                    desc: null,
                    receiver_id: salesManager.aid,
                  }
                ]
              },
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[1]._id,
                tickets: [
                  {
                    is_processed: false,
                    status: 13,
                    desc: null,
                    receiver_id: salesManager.aid,
                  }]
              }
            ]
          }

        }, {new: true});

      let message = await models()['SMMessageTest'].create({
        is_processed: false,
        is_closed: false,
        type: 2,
        order_id: orders[0]._id,
        order_line_id: orders[0].order_lines[0]._id,
        extra: {
          hasMoreOrderLines: true
        },
      })


      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`sm/cancel`),
        body: {
          id: message._id,
          cancelAll: false
        },
        method: 'POST',
        jar: salesManager.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);

      let foundOrder = await models()['OrderTest'].findOne({
        _id: orders[0]._id
      });


      expect(foundOrder.order_lines[0].cancel).toBeTruthy();
      expect(foundOrder.order_lines[1].cancel).toBeFalsy();

      let updatedMessage = await models()['SMMessageTest'].findOne({});
      expect(updatedMessage.is_processed).toBeTruthy();


      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });

  it('tests sales manager action when he cancels all order lines of an order', async function (done) {
    try {
      this.done = done;

      orders[0] = await models()['OrderTest'].findOneAndUpdate({
        _id: orders[0]._id
      }, {
          $set: {
            delivery_info: {
              time_slot: {
                lower_bound: 18,
                upper_bound: 22
              },
              delivery_cost: 15000
            },
            order_lines: [
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[0]._id,
                tickets: [
                  {
                    is_processed: false,
                    status: 13,
                    desc: null,
                    receiver_id: salesManager.aid,
                  }
                ]
              },
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[1]._id,
                tickets: [
                  {
                    is_processed: false,
                    status: 13,
                    desc: null,
                    receiver_id: salesManager.aid,
                  }]
              }
            ]
          }

        }, {new: true});

      let message = await models()['SMMessageTest'].create({
        is_processed: false,
        is_closed: false,
        type: 2,
        order_id: orders[0]._id,
        order_line_id: orders[0].order_lines[0]._id,
        extra: {
          hasMoreOrderLines: true
        },
      })


      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`sm/cancel`),
        body: {
          id: message._id,
          cancelAll: true
        },
        method: 'POST',
        jar: salesManager.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);

      let foundOrder = await models()['OrderTest'].findOne({
        _id: orders[0]._id
      });

      foundOrder.order_lines.forEach(x => {
        expect(x.cancel).toBeTruthy();
      })

      let updatedMessage = await models()['SMMessageTest'].findOne({});
      expect(updatedMessage.is_processed).toBeTruthy();

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });

  it('tests sales manager action when he renew order line', async function (done) {
    try {
      this.done = done;

      orders[0] = await models()['OrderTest'].findOneAndUpdate({
        _id: orders[0]._id
      }, {
          $set: {
            delivery_info: {
              time_slot: {
                lower_bound: 18,
                upper_bound: 22
              },
              delivery_cost: 15000
            },
            order_lines: [
              {
                product_price: 0,
                paid_price: 0,
                cancel: false,
                product_id: products[0]._id,
                product_instance_id: products[0].instances[0]._id,
                tickets: [
                  {
                    is_processed: false,
                    status: 13,
                    desc: null,
                    receiver_id: salesManager.aid,
                  }
                ]
              }
            ]
          }

        }, {new: true});

      let message = await models()['SMMessageTest'].create({
        is_processed: false,
        is_closed: false,
        type: 2,
        order_id: orders[0]._id,
        order_line_id: orders[0].order_lines[0]._id,
        extra: {
          hasMoreOrderLines: true
        },
      })


      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`sm/renew`),
        body: {
          id: message._id,
        },
        method: 'POST',
        jar: salesManager.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);

      let foundOrder = await models()['OrderTest'].findOne({
        _id: orders[0]._id
      });

      expect(foundOrder.order_lines[0].tickets.length).toBe(2);
      expect(foundOrder.order_lines[0].tickets[1].status).toBe(_const.ORDER_LINE_STATUS.Renew);
      expect(foundOrder.order_lines[0].tickets[1].receiver_id.toString()).toBe(warehouses[1]._id.toString());
      
      let updatedMessage = await models()['SMMessageTest'].findOne({});
      expect(updatedMessage.is_processed).toBeTruthy();

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });
});

