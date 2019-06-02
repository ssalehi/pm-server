const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');

describe('POST Search ScanInternalDeliveryBox', () => {

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

  it('should get c&c order line which is in hub and should go to warehouse (palladium)', async function (done) {
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
            type: 'ScanInternalDelivery',
          },
          offset: 0,
          limit: 10,
        },
        json: true,
        jar: hubClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(3);
      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should get c&c order line which is neither in hub or its destination (order lines are in centralWarehouse, destination is palladium)', async function (done) {
    try {
      this.done = done;

      let orders = [];

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12214",
        order_lines: [],
        is_collect: true,
        order_time: moment(),
        address: {
          _id: mongoose.Types.ObjectId(),
          city: "تهران",
          street: "نا مشخص",
          province: "تهران",
          warehouse_name: "پالادیوم",
          warehouse_id: palladiumWarehouse._id,
          recipient_first_name: "s",
          recipient_surname: "v",
          recipient_national_id: "8798789798",
          recipient_mobile_no: "09124077685",
        },
      });

      for (let i = 0; i < 2; i++) { // add 2 order line of first product instance for order 1
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
            type: 'ScanInternalDelivery',
          },
          offset: 0,
          limit: 10,
        },
        json: true,
        jar: CWClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it('should get order lines which is not in hub and is not c&c (in palladium warehouse and 2 order lines canceled)', async function (done) {
    try {
      this.done = done;

      let orders = [];

      orders.push({
        customer_id: mongoose.Types.ObjectId(),
        is_cart: false,
        transaction_id: "xyz12213",
        order_lines: [],
        is_collect: false,
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
              status: _const.ORDER_LINE_STATUS.DeliverySet,
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
          cancel: true,
          tickets: [
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.DeliverySet,
              desc: null,
              receiver_id: palladiumWarehouse._id,
              timestamp: moment()
            },
            {
              is_processed: false,
              status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
              desc: null,
              receiver_id: palladiumWarehouse._id,
              timestamp: moment()
            }
          ]
        })
      }

      // orders.push({
      //   customer_id: mongoose.Types.ObjectId(),
      //   is_cart: false,
      //   transaction_id: "xyz12214",
      //   order_lines: [],
      //   is_collect: false,
      //   order_time: moment(),
      // });
      //
      // for (let i = 0; i < 4; i++) { // add 4 order line of first product instance for order 2
      //   orders[1].order_lines.push({
      //     paid_price: 0,
      //     product_id: products[0].id,
      //     product_instance_id: products[0].instances[0].id,
      //     adding_time: moment(),
      //     cancel: false,
      //     tickets: [
      //       {
      //         is_processed: false,
      //         status: _const.ORDER_LINE_STATUS.FinalCheck,
      //         desc: null,
      //         receiver_id: palladiumWarehouse._id,
      //         timestamp: moment()
      //       }
      //     ]
      //   })
      // }
      //
      // for (let i = 0; i < 2; i++) { // add 2 order line of second product instance for order 2
      //   orders[1].order_lines.push({
      //     paid_price: 0,
      //     product_id: products[0].id,
      //     product_instance_id: products[0].instances[1].id,
      //     adding_time: moment(),
      //     cancel: true,
      //     tickets: [
      //       {
      //         is_processed: false,
      //         status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
      //         desc: null,
      //         receiver_id: palladiumWarehouse._id,
      //         timestamp: moment()
      //       }
      //     ]
      //   })
      // }

      orders = await models()['OrderTest'].insertMany(orders);
      orders = JSON.parse(JSON.stringify(orders));

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`search/Ticket`),
        body: {
          options: {
            type: 'ScanInternalDelivery',
          },
          offset: 0,
          limit: 10,
        },
        json: true,
        jar: palladiumClerk.jar,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(3);

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

});

describe('InternalUnAssigned Delivery', () => {

  let palladiumClerk = {
    aid: null,
    jar: null
  };

  let hubClerk = {
    aid: null,
    jar: null
  };

  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];

  let orders, products, deliveries, hubWarehouse, palladiumWarehouse;

  beforeEach(async done => {
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

      products = await models()['ProductTest'].insertMany([{
        article_no: 'xy123',
        name: 'sample 1',
        product_type: {
          name: 'sample type',
          product_type_id: mongoose.Types.ObjectId()
        },
        brand: {
          name: 'sample brand',
          brand_id: mongoose.Types.ObjectId()
        },
        base_price: 30000,
        desc: 'some description for this product',
        colors: [{
          color_id: colorIds[0],
          name: 'green'
        },
          {
            color_id: colorIds[1],
            name: 'yellow'
          },
          {
            color_id: colorIds[2],
            name: 'red'
          }
        ],
        instances: [{
          product_color_id: colorIds[0],
          size: "11",
          price: 2000,
          barcode: '0394081341',
          inventory: [{
            count: 3,
            reserved: 1,
            warehouse_id: warehouses[1]._id
          }, {
            count: 2,
            reserved: 0,
            warehouse_id: warehouses[2]._id
          }, {
            count: 3,
            reserved: 0,
            warehouse_id: warehouses[3]._id
          }, {
            count: 4,
            reserved: 0,
            warehouse_id: warehouses[4]._id
          }]
        },
          {
            product_color_id: colorIds[1],
            size: "10",
            price: 4000,
            barcode: '19231213123',
            inventory: [{
              count: 2,
              reserved: 2,
              warehouse_id: warehouses[1]._id
            }, {
              count: 1,
              reserved: 0,
              warehouse_id: warehouses[2]._id
            }, {
              count: 4,
              reserved: 0,
              warehouse_id: warehouses[3]._id
            }, {
              count: 5,
              reserved: 0,
              warehouse_id: warehouses[4]._id
            }]
          }
        ]
      }]);

      products = JSON.parse(JSON.stringify(products));
      orders = await models()['OrderTest'].insertMany([{
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45300',
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.ORDER_STATUS.DeliverySet,
          desc: null,
          receiver_id: palladiumWarehouse._id,
          timestamp: new Date()
        }],
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
            status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
            desc: null,
            receiver_id: hubWarehouse._id,
            timestamp: new Date()
          }]

        },
          {
            product_id: products[0],
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: products[0].instances[0]._id,
            tickets: [{
              is_processed: false,
              _id: mongoose.Types.ObjectId(),
              status: _const.ORDER_LINE_STATUS.DeliverySet,
              desc: null,
              receiver_id: hubWarehouse._id,
              timestamp: new Date()
            }]
          }
        ]
      }, {
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz98323',
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.ORDER_STATUS.default,
          desc: null,
          timestamp: new Date()
        }],
        order_lines: [{
            product_id: products[0],
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: products[0].instances[0]._id,
            tickets: [{
              is_processed: false,
              _id: mongoose.Types.ObjectId(),
              status: _const.ORDER_LINE_STATUS.DeliverySet,
              desc: null,
              receiver_id: hubWarehouse._id,
              timestamp: new Date()
            }]
          }
        ]
      }]);

      orders = JSON.parse(JSON.stringify(orders));
      deliveries = await models()['DeliveryTest'].insertMany([{
        // delivery 0 : from a shop to hub
        to: {
          warehouse_id: hubWarehouse._id
        },
        from: {
          warehouse_id: palladiumWarehouse._id
        },
        order_details: [{
          order_line_ids: [
            orders[0].order_lines[0]._id,
          ],
          _id: mongoose.Types.ObjectId(),
          order_id: orders[0]._id

        }],
        start: new Date(),
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.DELIVERY_STATUS.default,
          receiver_id: palladiumWarehouse._id,
          timestamp: new Date()
        }]
      },
        { //delivery 1:  from hub to shop
          to: {
            warehouse_id: palladiumWarehouse._id
          },
          from: {
            warehouse_id: hubWarehouse._id
          },

          order_details: [{
            order_line_ids: [
              orders[0].order_lines[0]._id,
              orders[0].order_lines[1]._id
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
          }]
        },
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);


  it('should see orders ready to assign internal delivery agent from shop to hub', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
     options: {
       type: 'InternalUnassignedDelivery'
     },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: palladiumClerk.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    done();

  });

  it('should see orders ready to assign internal delivery agent from hub to shop', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'InternalUnassignedDelivery'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      jar: hubClerk.jar,
      resolveWithFullResponse: true
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.total).toBe(1);
    done();
  });

});

describe('Internal Assigned Delivery for App', () => {

  let orders, products, deliveries;
  let agentObj = {
    aid: null,
    jar: null
  };

  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
      agentObj.aid = agent.aid;
      agentObj.jar = agent.rpJar;
      await models()['WarehouseTest'].insertMany(warehouses)
      products = await models()['ProductTest'].insertMany([{
        article_no: 'xy123',
        name: 'sample 1',
        product_type: {
          name: 'sample type',
          product_type_id: mongoose.Types.ObjectId()
        },
        brand: {
          name: 'sample brand',
          brand_id: mongoose.Types.ObjectId()
        },
        base_price: 30000,
        desc: 'some description for this product',
        colors: [{
          color_id: colorIds[0],
          name: 'green'
        },
          {
            color_id: colorIds[1],
            name: 'yellow'
          },
          {
            color_id: colorIds[2],
            name: 'red'
          }
        ],
        instances: [{
          product_color_id: colorIds[0],
          size: "11",
          price: 2000,
          barcode: '0394081341',
          inventory: [{
            count: 3,
            reserved: 1,
            warehouse_id: warehouses[1]._id
          }, {
            count: 2,
            reserved: 0,
            warehouse_id: warehouses[2]._id
          }, {
            count: 3,
            reserved: 0,
            warehouse_id: warehouses[3]._id
          }, {
            count: 4,
            reserved: 0,
            warehouse_id: warehouses[4]._id
          }]
        },
          {
            product_color_id: colorIds[1],
            size: "10",
            price: 4000,
            barcode: '19231213123',
            inventory: [{
              count: 2,
              reserved: 2,
              warehouse_id: warehouses[1]._id
            }, {
              count: 1,
              reserved: 0,
              warehouse_id: warehouses[2]._id
            }, {
              count: 4,
              reserved: 0,
              warehouse_id: warehouses[3]._id
            }, {
              count: 5,
              reserved: 0,
              warehouse_id: warehouses[4]._id
            }]
          }
        ]
      }]);

      products = JSON.parse(JSON.stringify(products));

      orders = await models()['OrderTest'].insertMany([{
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45300',
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.ORDER_STATUS.default,
          desc: null,
          receiver_id: agentObj.aid,
          timestamp: new Date()
        }],
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
            status: _const.ORDER_LINE_STATUS.DeliverySet,
            desc: null,
            receiver_id: agentObj.aid,
            timestamp: new Date()
          }]
        }
        ]
      }]);

      orders = JSON.parse(JSON.stringify(orders));
      deliveries = await models()['DeliveryTest'].insertMany([{
        //delivery 0 : from a shop to hub
        to: {
          warehouse_id: warehouses.find(x => x.is_hub)._id
        },
        from: {
          warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
        },
        order_details: [{
          order_line_ids: [
            orders[0].order_lines[0]._id,
          ],
          _id: mongoose.Types.ObjectId(),
          order_id: orders[0]._id

        }],
        start: new Date(),
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.DELIVERY_STATUS.agentSet,
          receiver_id: agentObj.aid,
          timestamp: new Date()
        }],
        delivery_agent: agentObj.aid,
      }
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);


  it('should see delivery from shop to hub', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'InternalAssignedDelivery'
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

describe('End Delivery-Internal Delivery', () => {

  let orders, products, deliveries;
  let agentObj = {
    id: null,
    jar: null
  };

  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll()
      const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
      agentObj.id = agent.aid;
      agentObj.jar = agent.rpJar;
      await models()['WarehouseTest'].insertMany(warehouses)
      products = await models()['ProductTest'].insertMany([{
        article_no: 'xy123',
        name: 'sample 1',
        product_type: {
          name: 'sample type',
          product_type_id: mongoose.Types.ObjectId()
        },
        brand: {
          name: 'sample brand',
          brand_id: mongoose.Types.ObjectId()
        },
        base_price: 30000,
        desc: 'some description for this product',
        colors: [{
          color_id: colorIds[0],
          name: 'green'
        },
          {
            color_id: colorIds[1],
            name: 'yellow'
          },
          {
            color_id: colorIds[2],
            name: 'red'
          }
        ],
        instances: [{
          product_color_id: colorIds[0],
          size: "11",
          price: 2000,
          barcode: '0394081341',
          inventory: [{
            count: 3,
            reserved: 1,
            warehouse_id: warehouses[1]._id
          }, {
            count: 2,
            reserved: 0,
            warehouse_id: warehouses[2]._id
          }, {
            count: 3,
            reserved: 0,
            warehouse_id: warehouses[3]._id
          }, {
            count: 4,
            reserved: 0,
            warehouse_id: warehouses[4]._id
          }]
        },
          {
            product_color_id: colorIds[1],
            size: "10",
            price: 4000,
            barcode: '19231213123',
            inventory: [{
              count: 2,
              reserved: 2,
              warehouse_id: warehouses[1]._id
            }, {
              count: 1,
              reserved: 0,
              warehouse_id: warehouses[2]._id
            }, {
              count: 4,
              reserved: 0,
              warehouse_id: warehouses[3]._id
            }, {
              count: 5,
              reserved: 0,
              warehouse_id: warehouses[4]._id
            }]
          }
        ]
      }]);

      products = JSON.parse(JSON.stringify(products));

      orders = await models()['OrderTest'].insertMany([{
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45300',
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.ORDER_STATUS.OnDelivery,
          desc: null,
          receiver_id: agentObj.aid,
          timestamp: new Date()
        }],
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
            status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
            desc: null,
            receiver_id: agentObj.aid,
            timestamp: new Date()
          }]

        },
          {
            product_id: products[0],
            campaign_info: {
              _id: mongoose.Types.ObjectId(),
              discount_ref: 0
            },
            product_instance_id: products[0].instances[0]._id,
            tickets: [{
              is_processed: false,
              _id: mongoose.Types.ObjectId(),
              status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
              desc: null,
              receiver_id: agentObj.aid,
              timestamp: new Date()
            }]
          }
        ]
      }]);

      orders = JSON.parse(JSON.stringify(orders));
      deliveries = await models()['DeliveryTest'].insertMany([{
        to: {
          warehouse_id: warehouses.find(x => x.is_hub)._id
        },
        from: {
          warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
        },
        order_details: [{
          order_line_ids: [
            orders[0].order_lines[0]._id,
            orders[0].order_lines[1]._id,

          ],
          _id: mongoose.Types.ObjectId(),
          order_id: orders[0]._id

        }],
        start: new Date(),
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.DELIVERY_STATUS.agentSet,
          receiver_id: agentObj.aid,
          timestamp: new Date()
        }]
      }]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);
  it('should end intenal delivery ', async function (done) {
    this.done = done;
    const res = await rp({
      jar: agentObj.jar,
      body: {
        deliveryId: deliveries[0]._id,
        user: agentObj
      },
      method: 'POST',
      json: true,
      uri: lib.helpers.apiTestURL('delivery/end'),
      resolveWithFullResponse: true
    });
    expect(res.statusCode).toBe(200)
    const deliveryData = await models()['DeliveryTest'].find()
    const orderData = await models()['OrderTest'].find()
    deliveryTicketStatus = deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status
    expect(deliveryTicketStatus).toBe(_const.DELIVERY_STATUS.ended)
    orderData[0].order_lines.forEach(orderline => {
      expect(orderline.tickets[orderline.tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Delivered)
    });

    done()
  });


});