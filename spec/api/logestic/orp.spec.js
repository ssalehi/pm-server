const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const pre_data = require('./pre-data');

describe('ORP', () => {

  let customerObj;


  addToBasket = (customerId, currentOrderId, products) => {

    let order_lines = [];
    products.forEach(x => {

      order_lines.push({
        product_id: x._id,
        product_instance_id: x.instance_id
      })
    });

    if (!currentOrderId) {

      return models()['OrderTest'].insertMany([
        {
          "customer_id": mongoose.Types.ObjectId(customerId),
          "is_cart": true,
          "transaction_id": null,
          order_lines
        }
      ])
    }
    else {
      return models()['OrderTest'].update({
        _id: mongoose.Types.ObjectId(currentOrderId)
      }, {
          $addToSet: {'order_lines': {$each: order_lines}}
        })
    }
  }

  checkoutOrder = async (order_id, customer, is_collect = false, shop = null) => {

    const address = {
      "_id": mongoose.Types.ObjectId("5b7938f9065a163ad091b3a1"),
      "province": "تهران",
      "city": "تهران",
      "street": "دوم شرقی",
      "unit": "6",
      "no": "4",
      "district": "چاردیواری",
      "recipient_title": "m",
      "recipient_name": "احسان",
      "recipient_surname": "انصاری بصیر",
      "recipient_national_id": "0010684281",
      "recipient_mobile_no": "09125975886",
      "postal_code": null,
      "loc": {"long": 51.379926, "lat": 35.696491}
    }
    const body = {
      "cartItems": {},
      order_id,
      "customerData": null,
      "transaction_id": "xyz71884",
      "used_point": 0,
      "used_balance": 0,
      "total_amount": 176000,
      "discount": 0,
      is_collect,
      "duration_days": 1,
      "time_slot": {"lower_bound": 10, "upper_bound": 18},
      "paymentType": "cash",
      "loyalty": {"delivery_spent": 0, "shop_spent": 0, "delivery_value": 0, "shop_value": 0, "earn_point": 7}
    }
    body.address = is_collect ? shop.address : address;

    await models()['CustomerTest'].update({
      _id: mongoose.Types.ObjectId(customer.cid)
    }, {
        $set: {
          "address": [address]
        }
      })

    return rp({
      method: 'post',
      body,
      jar: customer.rpJar,
      json: true,
      uri: lib.helpers.apiTestURL('/checkout'),
      resolveWithFullResponse: true,
    });


  }

  beforeEach(async (done) => {
    try {
      await lib.dbHelpers.dropAll();
      await models()['BrandTest'].insertMany(pre_data.brand);
      await models()['ProductTypeTest'].insertMany(pre_data.product_type);
      await models()['ColorTest'].insertMany(pre_data.color);
      await models()['DeliveryDurationInfoTest'].insertMany(pre_data.delivery_duration_info);
      await models()['LoyaltyGroupTest'].insertMany(pre_data.loyalty_group);
      await models()['AgentTest'].insertMany(pre_data.agent);
      await models()['ProductTest'].insertMany(pre_data.product);
      await models()['WarehouseTest'].insertMany(pre_data.warehouse);

      customerObj = await lib.dbHelpers.addAndLoginCustomer('eabasir@gmail.com', '123456', {
        first_name: 'Ehsan',
        surname: 'Ansari',
      });

    }
    catch (err) {
      console.log('-> ', err);
    }
    done()


  }, 20000);

  it('orp send (not C&C) order to "central" warehouse when it has inventory and reserve it', async function (done) {
    this.done = done;

    try {

      let updatedOrder = (await addToBasket(customerObj.cid, null, [{
        _id: pre_data.product[0]._id,
        instance_id: pre_data.product[0].instances[0]._id
      }]))[0]

      await checkoutOrder(updatedOrder._id, customerObj);
      let order = await models()['OrderTest'].findOne({_id: updatedOrder._id});
      expect(order.is_cart).toBeFalsy();
      expect(order.transaction_id).not.toBeNull();
      expect(order.order_lines.length).toBe(1);
      expect(order.order_lines[0].tickets.length).toBe(1);
      expect(order.order_lines[0].tickets[0].is_processed).toBeFalsy();
      expect(order.order_lines[0].tickets[0].status).toBe(_const.ORDER_STATUS.default);
      expect(order.order_lines[0].tickets[0].receiver_id.toString()).toBe(pre_data.warehouse.find(x => x.name === 'انبار مرکزی')._id.toString());

      let product = await models()['ProductTest'].findOne({_id: pre_data.product[0]._id});
      const foundInstance = product.instances.find(x => x._id.toString() === pre_data.product[0].instances[0]._id.toString());
      const newInventory = foundInstance.inventory.find(x => x.warehouse_id.toString() === pre_data.warehouse.find(x => x.name === 'انبار مرکزی')._id.toString())
      const preInventory = pre_data.product[0].instances[0].inventory.find(x => x.warehouse_id.toString() === pre_data.warehouse.find(x => x.name === 'انبار مرکزی')._id.toString());
      expect(newInventory.reserved).toBe(1); // reserved number should be increased by one
      expect(newInventory.count).toBe(preInventory.count);  // count should not be changed

      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('orp send (not C&C) order to "paladium" warehoues and reserve it when "central" warehouse has no inventory any more ', async function (done) {
    this.done = done;

    try {
      const items = [];
      for (let i = 0; i < 3; i++) {
        items.push({
          _id: pre_data.product[0]._id,
          instance_id: pre_data.product[0].instances[0]._id
        });
      }

      let updatedOrder = (await addToBasket(customerObj.cid, null, items))[0]

      await checkoutOrder(updatedOrder._id, customerObj);
      let order = await models()['OrderTest'].findOne({_id: updatedOrder._id});
      expect(order.order_lines.length).toBe(3);

      for (let i = 0; i < 3; i++) {
        const orderLine = order.order_lines[i];
        expect(orderLine.tickets.length).toBe(1);
        expect(orderLine.tickets[0].is_processed).toBeFalsy();
        expect(orderLine.tickets[0].status).toBe(_const.ORDER_STATUS.default);
      }

      const central = pre_data.warehouse.find(x => x.name === 'انبار مرکزی');
      const paladium = pre_data.warehouse.find(x => x.name === 'پالادیوم');

      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === central._id.toString()).length).toBe(2);
      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === paladium._id.toString()).length).toBe(1);

      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('orp send (not C&C) order to "sana" warehoues and reserve it when "central" and "paladium" warehouse has no inventory any more ', async function (done) {
    this.done = done;

    try {
      const items = [];
      for (let i = 0; i < 5; i++) {
        items.push({
          _id: pre_data.product[0]._id,
          instance_id: pre_data.product[0].instances[0]._id
        });
      }

      let updatedOrder = (await addToBasket(customerObj.cid, null, items))[0]

      await checkoutOrder(updatedOrder._id, customerObj);
      let order = await models()['OrderTest'].findOne({_id: updatedOrder._id});
      expect(order.order_lines.length).toBe(5);

      for (let i = 0; i < 5; i++) {
        const orderLine = order.order_lines[i];
        expect(orderLine.tickets.length).toBe(1);
        expect(orderLine.tickets[0].is_processed).toBeFalsy();
        expect(orderLine.tickets[0].status).toBe(_const.ORDER_STATUS.default);
      }

      const central = pre_data.warehouse.find(x => x.name === 'انبار مرکزی');
      const paladium = pre_data.warehouse.find(x => x.name === 'پالادیوم');
      const sana = pre_data.warehouse.find(x => x.name === 'سانا');

      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === central._id.toString()).length).toBe(2);
      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === paladium._id.toString()).length).toBe(2);
      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === sana._id.toString()).length).toBe(1);

      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('orp send (not C&C) order to "iran mall" warehoues and reserve it when "central", "paladium" and "sana" warehouse has no inventory any more ', async function (done) {
    this.done = done;

    try {
      const items = [];
      for (let i = 0; i < 7; i++) {
        items.push({
          _id: pre_data.product[0]._id,
          instance_id: pre_data.product[0].instances[0]._id
        });
      }

      let updatedOrder = (await addToBasket(customerObj.cid, null, items))[0]

      await checkoutOrder(updatedOrder._id, customerObj);
      let order = await models()['OrderTest'].findOne({_id: updatedOrder._id});
      expect(order.order_lines.length).toBe(7);

      for (let i = 0; i < 7; i++) {
        const orderLine = order.order_lines[i];
        expect(orderLine.tickets.length).toBe(1);
        expect(orderLine.tickets[0].is_processed).toBeFalsy();
        expect(orderLine.tickets[0].status).toBe(_const.ORDER_STATUS.default);
      }

      const central = pre_data.warehouse.find(x => x.name === 'انبار مرکزی');
      const paladium = pre_data.warehouse.find(x => x.name === 'پالادیوم');
      const sana = pre_data.warehouse.find(x => x.name === 'سانا');
      const iranMall = pre_data.warehouse.find(x => x.name === 'ایران مال');

      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === central._id.toString()).length).toBe(2);
      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === paladium._id.toString()).length).toBe(2);
      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === sana._id.toString()).length).toBe(2);
      expect(order.order_lines.filter(x => x.tickets[0].receiver_id.toString() === iranMall._id.toString()).length).toBe(1);

      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('orp send C&C order to destination warehouse when it has inventory and reserve it', async function (done) {
    this.done = done;

    try {

      let updatedOrder = (await addToBasket(customerObj.cid, null, [{
        _id: pre_data.product[0]._id,
        instance_id: pre_data.product[0].instances[0]._id
      }]))[0]

      const paladium = pre_data.warehouse.find(x => x.name === 'پالادیوم');


      await checkoutOrder(updatedOrder._id, customerObj, true, paladium);
      let order = await models()['OrderTest'].findOne({_id: updatedOrder._id});
      expect(order.is_cart).toBeFalsy();
      expect(order.is_collect).toBeTruthy();
      expect(order.transaction_id).not.toBeNull();
      expect(order.order_lines.length).toBe(1);
      expect(order.order_lines[0].tickets.length).toBe(1);
      expect(order.order_lines[0].tickets[0].is_processed).toBeFalsy();
      expect(order.order_lines[0].tickets[0].status).toBe(_const.ORDER_STATUS.default);
      expect(order.order_lines[0].tickets[0].receiver_id.toString()).toBe(paladium._id.toString());

      let product = await models()['ProductTest'].findOne({_id: pre_data.product[0]._id});
      const foundInstance = product.instances.find(x => x._id.toString() === pre_data.product[0].instances[0]._id.toString());
      const newInventory = foundInstance.inventory.find(x => x.warehouse_id.toString() === paladium._id.toString())
      const preInventory = pre_data.product[0].instances[0].inventory.find(x => x.warehouse_id.toString() === paladium._id.toString());
      expect(newInventory.reserved).toBe(1); // reserved number should be increased by one
      expect(newInventory.count).toBe(preInventory.count);  // count should not be changed

      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });


});

