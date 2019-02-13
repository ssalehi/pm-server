const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');
const utils = require('../utils');


describe('POST Search Scan Inbox', () => {

  let CWClerk = { // central warehouse clerk
    aid: null,
    jar: null,
  };

  let palladiumClerk = {
    aid: null,
    jar: null
  };

  let hubClerk = {
    aid: null,
    jar: null
  };

  let products, centralWarehouse, hubWarehouse, palladiumWarehouse;
  beforeEach(async (done) => {
    try {

      await lib.dbHelpers.dropAll();

      let warehouse = await models()['WarehouseTest'].insertMany(warehouses);
      warehouse = JSON.parse(JSON.stringify(warehouse));

      centralWarehouse = warehouse.find(x => !x.is_hub && !x.has_customer_pickup);
      hubWarehouse = warehouse.find(x => x.is_hub && !x.has_customer_pickup);

      palladiumWarehouse = warehouse.find(x => !x.is_hub && x.priority === 1);

      let res = await lib.dbHelpers.addAndLoginAgent('cwclerk', _const.ACCESS_LEVEL.ShopClerk, centralWarehouse._id);
      CWClerk.aid = res.aid;
      CWClerk.jar = res.rpJar;

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

  it('should get all scan Inbox grouped by order line count', async function (done) {
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
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.default,
              desc: null,
              receiver_id: centralWarehouse._id,
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
              status: _const.ORDER_LINE_STATUS.Renew,
              desc: null,
              receiver_id: centralWarehouse._id,
              timestamp: moment()
            }
          ]
        })
      }

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12214",
        order_lines: [],
        is_collect: false,
        order_time: moment(),
      });

      for (let i = 0; i < 2; i++) { // add 2 order line of first product instance for order 2
        orders[1].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[0].id,
          adding_time: moment(),
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
              desc: null,
              receiver_id: centralWarehouse._id,
              timestamp: moment()
            }
          ]
        })
      }

      for (let i = 0; i < 2; i++) { // add 2 order line of second product instance for order 2
        orders[1].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[1].id,
          adding_time: moment(),
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
              desc: null,
              receiver_id: centralWarehouse._id,
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
            type: 'Inbox'
          },
          offset: 0,
          limit: 10
        },
        json: true,
        jar: CWClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(2);

      let item1 = res.body.data.find(x => x.instance._id.toString() === products[0].instances[0]._id.toString());
      let item2 = res.body.data.find(x => x.instance._id.toString() === products[0].instances[1]._id.toString());

      expect(item1.count).toBe(5);
      expect(item2.count).toBe(4);

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

});


describe('POST inbox scan - new orderline', () => {
    let orders, products
    ShopClerk = {
        aid: null,
        jar: null,
    }
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
            const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id)
            ShopClerk.aid = sclerck.aid;
            ShopClerk.jar = sclerck.rpJar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    order_lines: [{
                        product_id: products[0]._id,
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: products[0].instances[0]._id,
                        tickets: [{
                            is_processed: false,
                            _id: mongoose.Types.ObjectId(),
                            status: _const.ORDER_LINE_STATUS.default,
                            desc: null,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id),
                            timestamp: new Date(),
                        }]
                    }]
                }
            });
            orderData = await models()['OrderTest'].find()
            done()
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('after scan create orderlines delivery back to centralwarehouse', async function (done) {
        this.done = done
        const res = await rp({
            jar: ShopClerk.jar,
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
        expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.WaitForOnlineWarehouse)
        done()
    });
});

describe('POST onlineWarehouseResponse(verify)', () => {
    let adminObj = {
        aid: null,
        jar: null,
    };

    let agentObj = {
        aid: null,
        jar: null,
    };

    let orders, products, deliveries, orderData
    let customer = {
        cid: null,
        jar: null
    };
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const agent = await lib.dbHelpers.addAndLoginAgent('DeliveryAgent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            const admin = await lib.dbHelpers.addAndLoginAgent('OfflineSystem', _const.ACCESS_LEVEL.OfflineSystem)
            adminObj.aid = admin.aid;
            adminObj.jar = admin.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer.cid = res.cid;
            customer.jar = res.rpJar;
            products = await utils.makeProducts();
            centralId = warehouses.find(x=> !x.is_hub && !x.has_customer_pickup)._id
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    order_lines: [{
                        product_id: products[0]._id,
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: products[0].instances[0]._id,
                        tickets: [{
                            is_processed: false,
                            _id: mongoose.Types.ObjectId(),
                            status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }, {
                        product_id: products[0],
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: products[0].instances[1]._id,
                        tickets: [{
                            is_processed: false,
                            _id: mongoose.Types.ObjectId(),
                            status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }]
                }
            });
            orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                from: {
                    warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id

                },
                order_details: [{
                    order_line_ids: [
                        orderData[0].order_lines[1]._id,
                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orderData[0]._id
                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses[3]._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('after online ware house verification new delivery created and orderline ticket is changed to deliveryset', async function (done) {
        this.done = done;
        await models()['DeliveryTest'].deleteMany({});
        const res = await rp({
            jar: adminObj.jar,
            body: {
                orderId: orders[0]._id,
                orderLineId: orderData[0].order_lines[0]._id,
                warehouseId: centralId,
                userId: '5c209119da8a28386c02471b',
                barcode: '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveries = await models()['DeliveryTest'].find();
        expect(deliveries.length).toBe(1)
        const res1 = await models()['OrderTest'].find()
        let lastTicket = res1[0].order_lines[0].tickets[res1[0].order_lines[0].tickets.length - 1].status;
        expect(lastTicket).toBe(_const.ORDER_LINE_STATUS.DeliverySet)
        done()
    });
    it('after online ware house verification should check the orderline is added to an existing delivery that is being started today ', async function (done) {
        this.done = done
        const res = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[0]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData.length).toBe(1)
        isExist = deliveryData[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orderData[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        expect(deliveryData[0].to.warehouse_id.toString()).toBe(warehouses.find(x => x.is_hub)._id.toString())
        done()
    });
    it('after online ware house verification should add the delivery to an existing one that has started few days ago', async function (done) {
        this.done = done;
        const deliveryData = await models()['DeliveryTest'].find()
        deliveryData[0].start = (new Date()).setDate(new Date().getDate() - 3);
        await deliveryData[0].save()
        const res = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[0]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        const deliveryData1 = await models()['DeliveryTest'].find()
        isExist = deliveryData1[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orderData[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        expect(deliveryData1[0].start.getDate()).not.toEqual(new Date().getDate())
        expect(deliveryData1.length).toBe(1)
        done()
    });
    it('after online ware house verification should check when the existing delivery is started creates a new delivery for new orderlines', async function (done) {
        this.done = done
        const deliveryData = await models()['DeliveryTest'].find()
        deliveryData[0].tickets[0].status = _const.DELIVERY_STATUS.started
        deliveryData[0].delivery_start = new Date()
        await deliveryData[0].save()
        const addDelivery = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[1]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081342'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(addDelivery.statusCode).toBe(200)
        const deliveryData2 = await models()['DeliveryTest'].find()
        expect(deliveryData2.length).toBe(2)
        newDelivery = deliveryData2.find(delivery => delivery.tickets[0].status === _const.DELIVERY_STATUS.default)
        let currentDay = moment().format('YYYY-MM-DD');
        expect(moment(newDelivery.start).format('YYYY-MM-DD')).toBe(currentDay)
        done()
    });
    it('should check after onlinewarehouseverification the reserved and count of an inventory are reduced by 1', async function (done) {
        this.done = done
        await utils.changeInventory(products[0]._id, products[0].instances[0]._id, warehouses[1]._id, 0, 1)

        oldProducts = await models()['ProductTest'].find()
        oldReserved = oldProducts[0].instances[0].inventory.find(inv => inv.warehouse_id = warehouses[1]._id).reserved
        const addDelivery = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[0]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        expect(addDelivery.statusCode).toBe(200)
        const productsData = await models()['ProductTest'].find()
        NewCount = productsData[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === centralId.toString()).count
        NewReserved = productsData[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === centralId.toString()).reserved
        expect(NewCount).toBe(products[0].instances[0].inventory[0].count - 1)
        expect(NewReserved).toBe(oldReserved - 1)
        done()
    });
  
});

describe('POST inbox scan - canceled orderline', () => {
    let orders, products
    ShopClerk = {
        aid: null,
        jar: null,
    }
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

            const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id)
            ShopClerk.aid = sclerck.aid;
            ShopClerk.jar = sclerck.rpJar
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
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id),
                            timestamp: new Date(),
                        }]
                    }]
                }
            });
            orderData = await models()['OrderTest'].find()
            done()
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('after scan create orderlines delivery back to centralwarehouse', async function (done) {
        this.done = done
        const res = await rp({
            jar: ShopClerk.jar,
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
        expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel)
        done()
    });
});

describe('POST onlineWarehouseResponse(cancel)', () => {
    let adminObj = {
        aid: null,
        jar: null,
    };

    let orders, products, orderData
    let customer = {
        cid: null,
        jar: null
    }
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const admin = await lib.dbHelpers.addAndLoginAgent('OfflineSystem', _const.ACCESS_LEVEL.OfflineSystem)
            adminObj.aid = admin.aid;
            adminObj.jar = admin.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer.cid = res.cid;
            customer.jar = res.rpJar;
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
                            status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }]
                }
            });
            orderData = await models()['OrderTest'].find()
            done()
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('after online warehouse cancel should check orderline ticket to be canceled', async function (done) {
        this.done = done
        sanaId = warehouses.find(x => x.name === 'سانا')._id.toString()
        const canceled = await rp({
            jar: adminObj.jar,
            body: {
                userId: adminObj.aid,
                orderId: orders[0]._id,
                orderLineId: orderData[0].order_lines[0]._id,
                warehouseId: sanaId,
                barcode: '0394081341',
                reverse: true,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(canceled.statusCode).toBe(200)
        NorderData = await models()['OrderTest'].find()
        expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Canceled)
        const NproductsData = await models()['ProductTest'].find()
        NewCount = NproductsData[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === sanaId).count
        prevCount = products[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === sanaId).count
        expect(NewCount).toBe(prevCount + 1)
        done()
    });
});
