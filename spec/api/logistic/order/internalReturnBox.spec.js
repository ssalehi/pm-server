const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');
const utils = require('../utils');

describe('POST Search ScanInternalReturnBox', () => {

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


  it('should get order lines which have canceled or returned', async function (done) {
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
      for (let i = 0; i < 2; i++) { // add 2 order line of second product instance for order 1
        orders[0].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[1].id,
          adding_time: moment(),
          cancel: true,
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.FinalCheck,
              desc: null,
              receiver_id: hubWarehouse._id,
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
        is_collect: true,
        order_time: moment(),
      });

      for (let i = 0; i < 2; i++) { // add 2 order line of first product instance for order 2
        orders[1].order_lines.push({
          paid_price: 0,
          product_id: products[0].id,
          product_instance_id: products[0].instances[0].id,
          adding_time: moment(),
          cancel: false,
          tickets:
        [
          {
            is_processed: false,
            status: _const.ORDER_LINE_STATUS.ReturnRequested,
            desc: null,
            receiver_id: palladiumWarehouse._id,
            timestamp: moment()
          },
          {
            is_processed: false,
            status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
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
            type: 'ScanReturnDelivery',
          },
          offset: 0,
          limit: 10,
        },
        json: true,
        jar: hubClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(4);

      let item1 = res.body.data.filter(x => x.instance._id.toString() === products[0].instances[0]._id.toString());
      let item2 = res.body.data.filter(x => x.instance._id.toString() === products[0].instances[1]._id.toString());

      expect(item1.length).toBe(2);
      expect(item2.length).toBe(2);
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

});
