const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');
const utils = require('../utils');


describe('External Unassigned Delivery for App', () => {

  let orders, products, deliveries;
  let agentObj = {
    aid: null,
    jar: null
  };

  customer = {
    _id: null,
    jar: null,
  }

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

      const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
        first_name: 'S',
        surname: 'V'
      });
      customer._id = customerobj.cid;
      customer.jar = customerobj.jar;
      //
      // products = await models()['ProductTest'].insertMany([{
      //   article_no: 'xy123',
      //   name: 'sample 1',
      //   product_type: {
      //     name: 'sample type',
      //     product_type_id: mongoose.Types.ObjectId()
      //   },
      //   brand: {
      //     name: 'sample brand',
      //     brand_id: mongoose.Types.ObjectId()
      //   },
      //   base_price: 30000,
      //   desc: 'some description for this product',
      //   colors: [{
      //     color_id: colorIds[0],
      //     name: 'green'
      //   },
      //     {
      //       color_id: colorIds[1],
      //       name: 'yellow'
      //     },
      //     {
      //       color_id: colorIds[2],
      //       name: 'red'
      //     }
      //   ],
      //   instances: [{
      //     product_color_id: colorIds[0],
      //     size: "11",
      //     price: 2000,
      //     barcode: '0394081341',
      //     inventory: [{
      //       count: 3,
      //       reserved: 1,
      //       warehouse_id: warehouses[1]._id
      //     }, {
      //       count: 2,
      //       reserved: 0,
      //       warehouse_id: warehouses[2]._id
      //     }, {
      //       count: 3,
      //       reserved: 0,
      //       warehouse_id: warehouses[3]._id
      //     }, {
      //       count: 4,
      //       reserved: 0,
      //       warehouse_id: warehouses[4]._id
      //     }]
      //   },
      //     {
      //       product_color_id: colorIds[1],
      //       size: "10",
      //       price: 4000,
      //       barcode: '19231213123',
      //       inventory: [{
      //         count: 2,
      //         reserved: 2,
      //         warehouse_id: warehouses[1]._id
      //       }, {
      //         count: 1,
      //         reserved: 0,
      //         warehouse_id: warehouses[2]._id
      //       }, {
      //         count: 4,
      //         reserved: 0,
      //         warehouse_id: warehouses[3]._id
      //       }, {
      //         count: 5,
      //         reserved: 0,
      //         warehouse_id: warehouses[4]._id
      //       }]
      //     }
      //   ]
      // }]);
      //
      // products = JSON.parse(JSON.stringify(products));

      // orders = await models()['OrderTest'].insertMany([{
      //   order_time: new Date(),
      //   is_cart: false,
      //   transaction_id: 'xyz45300',
      //   tickets: [{
      //     is_processed: false,
      //     _id: mongoose.Types.ObjectId(),
      //     status: _const.ORDER_STATUS.DeliverySet,
      //     desc: null,
      //     receiver_id: agentObj.aid,
      //     timestamp: new Date()
      //   }],
      //   order_lines: [{
      //     product_id: products[0]._id,
      //     campaign_info: {
      //       _id: mongoose.Types.ObjectId(),
      //       discount_ref: 0
      //     },
      //     product_instance_id: products[0].instances[0]._id,
      //     tickets: [{
      //       is_processed: false,
      //       _id: mongoose.Types.ObjectId(),
      //       status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
      //       desc: null,
      //       receiver_id: agentObj.aid,
      //       timestamp: new Date()
      //     }]
      //
      //   },
      //     {
      //       product_id: products[0],
      //       campaign_info: {
      //         _id: mongoose.Types.ObjectId(),
      //         discount_ref: 0
      //       },
      //       product_instance_id: products[0].instances[0]._id,
      //       tickets: [{
      //         is_processed: false,
      //         _id: mongoose.Types.ObjectId(),
      //         status: _const.ORDER_LINE_STATUS.FinalCheck,
      //         desc: null,
      //         receiver_id: agentObj.aid,
      //         timestamp: new Date()
      //       }]
      //     }
      //   ]
      // }]);

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
      deliveries = await models()['DeliveryTest'].insertMany([{
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
          status: _const.DELIVERY_STATUS.agentSet,
          receiver_id: agentObj.aid,
          timestamp: new Date()
        }],
        delivery_agent: agentObj.aid,
        delivery_start: moment(),
        delivery_end: moment().add(1, 'd')
      },
        {
          to: {
            warehouse_id: warehouses.find(x => x.is_hub)._id
          },
          from: {
            customer: {
              _id: orderData[1].customer_id,
              address: orderData[1].address
            }
          },

          order_details: [{
            order_line_ids: [
              orderData[1].order_lines[0]._id,
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
          delivery_agent: agentObj.aid,
          delivery_start: moment(),
          delivery_end: moment().add(1, 'd')
        },
      ]);
      deliveries = JSON.parse(JSON.stringify(deliveries));
      done();
    } catch (err) {
      console.log(err);
    }
    ;
  }, 15000);


  it('should see delivery from hub to customer', async function (done) {
    this.done = done;

    const res = await rp({
      uri: lib.helpers.apiTestURL('search/DeliveryTicket'),
      method: 'POST',
      body: {
        options: {
          type: 'ExternalUnassignedDelivery'
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
    console.log('res body',res.body);
    done();

  });

});
