const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses')
const deliveryDurationInfo = require('../../../deliveryDurationInfo')
const utils = require('./utils');

describe('POST Order - ORP', () => {
  let orders, products;
  let customer = {
    cid: null,
    jar: null
  };


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

      products = await utils.makeProducts();
      orders = await utils.makeOrders(customer);

      for (let i = 0; i < orders.length; i++) {

        let res = await models()['OrderTest'].findOneAndUpdate({
          _id: orders[i]._id
        }, {
            $set: {
              tickets: [],
              is_cart: true,
              transaction_id: null,
            },
            $unset: {
              address: 1,
              delivery_info: 1,
              is_collect: 1,
              total_amount: 1,
            }

          }, {new: true});

        orders[i] = JSON.parse(JSON.stringify(res));
      }

      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);

  it('login user, not cc checkout ', async function (done) {
    try {
      this.done = done;
      let res = await models()['OrderTest'].findOneAndUpdate({
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
              }
            ],
          },
        }, {new: true});

      orders[0] = JSON.parse(JSON.stringify(res));

      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        body: {
          order_id: orders[0]._id,
          address: utils.loggedInCustomerAddress,
          duration_id: deliveryDurationInfo[0]._id,
          is_collect: false,
          paymentType: 0,
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },

        },
        jar: customer.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);
      let foundOrder = await models()['OrderTest'].findById(orders[0]._id);

      expect(foundOrder.tickets.length).toBe(1);
      expect(foundOrder.tickets[0].status).toBe(_const.ORDER_STATUS.WaitForAggregation);
      expect(foundOrder.tickets[0].receiver_id).toBeUndefined();


      expect(foundOrder.transaction_id).not.toBeUndefined();
      expect(foundOrder.is_collect).toBeFalsy();
      expect(foundOrder.is_cart).toBeFalsy();
      expect(foundOrder.address._id.toString()).toBe(utils.loggedInCustomerAddress._id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });

  it('login user, cc checkout ', async function (done) {
    try {

      this.done = done;
      let res = await models()['OrderTest'].findOneAndUpdate({
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
              }
            ],
          }
        }, {new: true});

      orders[0] = JSON.parse(JSON.stringify(res));


      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        body: {
          order_id: orders[0]._id,
          address: {
            recipient_email: null,
            recipient_mobile_no: "09125975886",
            recipient_name: "fdfdfdfd",
            recipient_national_id: "0010684281",
            recipient_surname: "dfdfdfdfd",
            recipient_title: "m",
            warehouse_id: warehouses[2]._id,
          },
          is_collect: true,
          paymentType: 0,
          duration_id: null,
          time_slot: null,

        },
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        jar: customer.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);
      let foundOrder = await models()['OrderTest'].findById(orders[0]._id);

      expect(foundOrder.tickets.length).toBe(1);
      expect(foundOrder.tickets[0].status).toBe(_const.ORDER_STATUS.WaitForAggregation);
      expect(foundOrder.tickets[0].receiver_id).toBeUndefined();


      expect(foundOrder.transaction_id).not.toBeUndefined();
      expect(foundOrder.is_collect).toBeTruthy();
      expect(foundOrder.is_cart).toBeFalsy();
      expect(foundOrder.address.warehouse_id.toString()).toBe(warehouses[2]._id.toString());

      done();

    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

  it('guest user, not cc checkout ', async function (done) {
    try {
      this.done = done;

      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        body: {
          cartItems: [
            {
              number: 1,
              product_id: products[0]._id,
              product_instance_id: products[0].instances[0]._id
            }
          ],
          address: {
            city: "تهران",
            district: "fhdlfjkdl",
            loc: {long: 51.379926, lat: 35.696491},
            no: "16",
            postal_code: "1616",
            province: "تهران",
            recipient_email: "jfdjflkjdl@fjkdjflkd.com",
            recipient_mobile_no: "09125975886",
            recipient_name: "jfldjklj",
            recipient_national_id: "0010684281",
            recipient_surname: "jfdjkfjdl",
            recipient_title: "m",
            street: "jfglkfjg",
            unit: "16"
          },
          duration_id: deliveryDurationInfo[0]._id,
          is_collect: false,
          paymentType: 0,
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },

        },
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);
      let foundOrder = await models()['OrderTest'].findOne({
        transaction_id: {$ne: null}
      });

      expect(foundOrder.tickets.length).toBe(1);
      expect(foundOrder.tickets[0].status).toBe(_const.ORDER_STATUS.WaitForAggregation);
      expect(foundOrder.tickets[0].receiver_id).toBeUndefined();

      expect(foundOrder.order_lines.length).toBe(1);
      expect(foundOrder.order_lines[0].product_id.toString()).toBe(products[0]._id.toString());
      expect(foundOrder.order_lines[0].product_instance_id.toString()).toBe(products[0].instances[0]._id.toString());


      expect(foundOrder.is_collect).toBeFalsy();
      expect(foundOrder.is_cart).toBeFalsy();

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

  it('guest user, cc checkout ', async function (done) {
    try {
      this.done = done;

      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        body: {
          order_id: orders[0]._id,
          cartItems: [
            {
              number: 1,
              product_id: products[0]._id,
              product_instance_id: products[0].instances[0]._id
            }
          ],
          address: {
            recipient_email: null,
            recipient_mobile_no: "09125975886",
            recipient_name: "fdfdfdfd",
            recipient_national_id: "0010684281",
            recipient_surname: "dfdfdfdfd",
            recipient_title: "m",
            warehouse_id: warehouses[2]._id,
          },
          is_collect: true,
          paymentType: 0,
          duration_id: null,
          time_slot: null,

        },
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);
      let foundOrder = await models()['OrderTest'].findOne({
        transaction_id: {$ne: null}
      });

      expect(foundOrder.tickets.length).toBe(1);
      expect(foundOrder.tickets[0].status).toBe(_const.ORDER_STATUS.WaitForAggregation);
      expect(foundOrder.tickets[0].receiver_id).toBeUndefined();


      expect(foundOrder.is_collect).toBeTruthy();
      expect(foundOrder.is_cart).toBeFalsy();
      expect(foundOrder.address.warehouse_id.toString()).toBe(warehouses[2]._id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });


  it('change inventory count and reserve for a single warehouse where it can afford an order ', async function (done) {
    try {
      this.done = done;
      let res = await models()['OrderTest'].findOneAndUpdate({
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
            ],
          },
        }, {new: true});

      orders[0] = JSON.parse(JSON.stringify(res));
      let PreInventory1 = products[0].instances[0].inventory.find(x =>
        x.warehouse_id.toString() === warehouses[1]._id.toString());

      let PreInventory2 = products[0].instances[1].inventory.find(x =>
        x.warehouse_id.toString() === warehouses[1]._id.toString());

      res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        body: {
          order_id: orders[0]._id,
          address: utils.loggedInCustomerAddress,
          duration_id: deliveryDurationInfo[0]._id,
          is_collect: false,
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },

        },
        method: 'POST',
        uri: lib.helpers.apiTestURL(`checkout/true`),
        jar: customer.jar,
        json: true,
        resolveWithFullResponse: true,
      });
      expect(res.statusCode).toBe(200);
      let foundOrder = await models()['OrderTest'].findById(orders[0]._id);

      let foundProduct = await models()['ProductTest'].findById(products[0]._id).lean();

      let newInventory1 = foundProduct.instances[0].inventory.find(x =>
        x.warehouse_id.toString() === warehouses[1]._id.toString());
      let newInventory2 = foundProduct.instances[1].inventory.find(x =>
        x.warehouse_id.toString() === warehouses[1]._id.toString());

      expect(newInventory1.count).toBe(PreInventory1.count);
      expect(newInventory2.count).toBe(PreInventory2.count);

      expect(newInventory1.reserved).toBe(PreInventory1.reserved + 2);
      expect(newInventory2.reserved).toBe(PreInventory2.reserved + 1);

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });

 
  

});

