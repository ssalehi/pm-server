const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');

xdescribe('InternalUnAssigned Delivery', () => {

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
      // warehouse = JSON.parse(JSON.stringify(warehouse));
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
              status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
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
          status: _const.ORDER_STATUS.DeliverySet,
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
              status: _const.ORDER_LINE_STATUS.FinalCheck,
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
        delivery_start: moment(),
        delivery_end: moment().add(1, 'd'),

      },
        { //delivery 1:  from hub to  shop
          to: {
            warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
          },
          from: {
            warehouse_id: warehouses.find(x => x.is_hub)._id
          },

          order_details: [{
            order_line_ids: [
              orders[0].order_lines[1]._id,
              orders[0].order_lines[0]._id
            ],
            _id: mongoose.Types.ObjectId(),
            order_id: orders[0]._id
          }],
          start: new Date(),
          tickets: [{
            is_processed: false,
            _id: mongoose.Types.ObjectId(),
            status: _const.DELIVERY_STATUS.requestPackage,
            receiver_id: agentObj.aid,
            timestamp: new Date()
          }],
          delivery_agent: agentObj.aid
        },
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
    expect(res.body.data.length).toBe(2);
    done();

  });

});

xdescribe('End Delivery-Internal Delivery', () => {

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