const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');
const _const = require('../../../lib/const.list');





describe('POST Search Ticket on Outbox tab', () => {
  let customerObj = {
    cid: null,
    jar: null
  };
  let SalesManager = {
    aid: null,
    jar: null
  };

  let productIds = [];
  let productInstanceIds = [];
  let orderId, orderLineId;

  let address = {
    province: "assd",
    city: "dsgg",
    district: "sdgsdg",
    street: "sdgsdgdsg",
    unit: "2",
    no: "4",
    postal_code: "512123456",
    loc: {
      long: 12,
      lat: 12,
    }
  };
  let warehouses = [
    {
      _id: mongoose.Types.ObjectId(),
      name: 'انبار مرکزی',
      phone: 'نا مشخص',
      address: {
        city: 'تهران',
        street: 'نامشخص',
        province: 'تهران'
      },
      is_hub: true,
      priority: 0,

    },
    {
      _id: mongoose.Types.ObjectId(),
      name: 'پالادیوم',
      phone: ' 021 2201 0600',
      has_customer_pickup: true,
      address: {
        city: 'تهران',
        street: 'مقدس اردبیلی',
        province: 'تهران'
      },
      priority: 1,

    },
    {
      _id: mongoose.Types.ObjectId(),
      name: 'سانا',
      phone: '021 7443 8111',
      has_customer_pickup: true,
      address: {
        province: 'تهران',
        city: 'تهران',
        street: 'اندرزگو',
      },
      priority: 2,
    },
    {
      _id: mongoose.Types.ObjectId(),
      name: 'ایران مال',
      phone: 'نا مشخص',
      has_customer_pickup: true,
      address: {
        province: 'تهران',
        city: 'تهران',
        street: 'اتوبان خرازی',
      },
      priority: 3,
    }
  ];
  let products = [{
    // product 1
    _id: mongoose.Types.ObjectId(),
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
    colors: [
      {
        color_id: mongoose.Types.ObjectId(),
        name: 'green'
      },
      {
        color_id: mongoose.Types.ObjectId(),
        name: 'yellow'
      },
      {
        color_id: mongoose.Types.ObjectId(),
        name: 'red'
      }
    ],
    instances: [{
      _id: mongoose.Types.ObjectId(),
      product_color_id: mongoose.Types.ObjectId(),
      size: "11",
      article_no: "aaaa",
      price: 2000,
      barcode: '0394081341',
      inventory: [{
        count: 1,
        reserved: 0,
        warehouse_id: mongoose.Types.ObjectId()
      },{
        count: 2,
        reserved: 0,
        warehouse_id:mongoose.Types.ObjectId()
      },{
        count: 3,
        reserved: 0,
        warehouse_id: mongoose.Types.ObjectId()
      },{
        count: 4,
        reserved: 0,
        warehouse_id: mongoose.Types.ObjectId()
      }]
    },
      {
        _id: mongoose.Types.ObjectId(),
        product_color_id: mongoose.Types.ObjectId(),
        size: "10",
        article_no: "nnnnn",
        price: 4000,
        barcode: '19231213123',
        inventory: [{
          count: 2,
          reserved: 2,
          warehouse_id: mongoose.Types.ObjectId()
        },{
          count: 3,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        },{
          count: 4,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        },{
          count: 5,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }]
      }
    ]
  },{
    // product 2
    _id: mongoose.Types.ObjectId(),
    name: 'sample 2',
    product_type: {
      name: 'sample type 2',
      product_type_id: mongoose.Types.ObjectId()
    },
    brand: {
      name: 'sample brand 2',
      brand_id: mongoose.Types.ObjectId()
    },
    base_price: 100000,
    desc: 'some description for this product 2',
    colors: [
      {
        color_id: mongoose.Types.ObjectId(),
        name: 'green'
      },
      {
        color_id: mongoose.Types.ObjectId(),
        name: 'yellow'
      },
      {
        color_id: mongoose.Types.ObjectId(),
        name: 'red'
      }
    ],
    instances: [{
      _id: mongoose.Types.ObjectId(),
      product_color_id: mongoose.Types.ObjectId(),
      size: "20",
      article_no: "ssss",
      price: 2000,
      barcode: '99999999',
      inventory: [{
        count: 1,
        reserved: 0,
        warehouse_id: mongoose.Types.ObjectId()
      },{
        count: 2,
        reserved: 0,
        warehouse_id:mongoose.Types.ObjectId()
      },{
        count: 3,
        reserved: 0,
        warehouse_id: mongoose.Types.ObjectId()
      },{
        count: 4,
        reserved: 0,
        warehouse_id: mongoose.Types.ObjectId()
      }]
    },
      {
        _id: mongoose.Types.ObjectId(),
        product_color_id: mongoose.Types.ObjectId(),
        size: "20",
        article_no: "llllllll",
        price: 30000,
        barcode: '1888888888',
        inventory: [{
          count: 2,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        },{
          count: 3,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        },{
          count: 4,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        },{
          count: 5,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }]
      }
    ]
  }];


  beforeEach(done => {

    lib.dbHelpers.dropAll()
      .then((res) => {
        // create warehouses
        return models['WarehouseTest'].insertMany(warehouses);
      })
      .then((res) => {
        return lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {addresses: [address]})
      })
      .then(res => {
        // customer login
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(x => x.is_hub)._id)
      })
      .then(res => {
        // SalesManager login
        SalesManager.aid = res.aid;
        SalesManager.jar = res.rpJar;

        return models['ProductTest'].insertMany(products);

      })
      .then(res => {

        productIds = res.map(el => el._id);
        productInstanceIds = res[0].instances.map(el => el._id);
        let orders = [{
          customer_id: customerObj.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [
              {
                receiver_id: warehouses.find(x => x.name === 'سانا')._id,
                status: _const.ORDER_STATUS.DeliverySet,
                agent_id: SalesManager.aid,
                is_processed: false,
                desc: 'This is a description'
              },
              {
                receiver_id: SalesManager.aid,
                status: _const.ORDER_STATUS.ReadyToDeliver,
                desc: 'This is a description',
              }
            ]
          },{
            product_id: productIds[1],
            product_instance_id: productInstanceIds[0],
            tickets: [
              {
                receiver_id: warehouses.find(x => x.is_hub)._id,
                status: _const.ORDER_STATUS.DeliverySet,
                agent_id: SalesManager.aid,
                desc: 'This is a description',
              }
            ]
          }, {
            product_id: productIds[1],
            product_instance_id: productInstanceIds[0],
            tickets: [
              {
                receiver_id: warehouses.find(x => x.is_hub)._id,
                status: _const.ORDER_STATUS.InvoiceVerified,
                agent_id: SalesManager.aid,
                desc: 'This is a description',
              }
            ]
          }]
        }, {
          customer_id: customerObj.cid,
          total_amount: 1,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[1],
            product_instance_id: productInstanceIds[1],
            tickets: [
              {
                receiver_id: warehouses.find(x => x.name === 'پالادیوم')._id,
                status: _const.ORDER_STATUS.DeliverySet,
                agent_id: SalesManager.aid,
                desc: 'This is a description'
              },
              {
                receiver_id: SalesManager.aid,
                status: _const.ORDER_STATUS.ReadyToDeliver,
                desc: 'This is a description',
              }
            ]
          },{
            product_id: productIds[1],
            product_instance_id: productInstanceIds[0],
            tickets: [
              {
                receiver_id: warehouses.find(x => x.is_hub)._id,
                status: _const.ORDER_STATUS.DeliverySet,
                agent_id: SalesManager.aid,
                desc: 'This is a description',
              }
            ]
          } ,{
            product_id: productIds[1],
            product_instance_id: productInstanceIds[0],
            tickets: [
              {
                receiver_id: warehouses.find(x => x.is_hub)._id,
                status: _const.ORDER_STATUS.InvoiceVerified,
                agent_id: SalesManager.aid,
                desc: 'This is a description',
              }
            ]
          }]
        }];
        return models['OrderTest'].insertMany(orders);

      })
      .then(res => {
        orderId = res[0].order_id;
        orderLineId = res[0].order_lines[0]._id;

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should show a order line with ReadyToDeliver, DeliverySet, OnDelivery, Delivered status', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`search/Ticket`),
      body: {
          options: {
            type: 'readyToDeliver',
            phrase: ''
          },
          offset: 0,
          limit: 10
        },
      json: true,
      resolveWithFullResponse: true,
      jar: SalesManager.jar
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.data[0].order_lines[0].tickets.length).toBe(2);
        expect(res.body.data[0].order_lines[0].tickets[1].status).toBe(9);
        expect(res.body.data[0].order_lines[0].tickets[0].status).toBe(10);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should not show a order line when is processed is true', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`search/Ticket`),
      body: {
        options: {
          is_processed: 'true',
          phrase: ''
        },
        offset: 0,
        limit: 10
      },
      json: true,
      resolveWithFullResponse: true,
      jar: SalesManager.jar
    })
      .then(res => {
      this.fail('can not set ticket when is processed is true');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidSearchQuery.statusCode);
        expect(err.error).toBe(error.invalidSearchQuery.message);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});