const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const error = require('../../../lib/errors.list');

describe("GET Tickets", () => {
  let customerObj = {
    cid: null,
    jar: null
  };
  let SalesManager = {
    aid: null,
    jar: null
  };
  
  let SCAgent = {
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
  }];


  beforeEach(done => {
    
    lib.dbHelpers.dropAll()
      .then((res) => {
        // create warehouses
        return models['WarehouseTest'].insertMany(warehouses);
      })
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => x.name === 'سانا')._id)
      })
      .then((res) => {
        // ShopClerk login
        SCAgent.aid = res.aid;
        SCAgent.jar = res.rpJar;

        return lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {addresses: [address]})
      })
      .then(res => {
        // customer login
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        return lib.dbHelpers.addAndLoginAgent('bm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(x => x.is_hub)._id)
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
                status: _const.ORDER_STATUS.default,
                agent_id: SalesManager.aid,
                desc: 'asas##$ sdsd 3423 232'
              },
              {
                receiver_id: SalesManager.aid,
                status: _const.ORDER_STATUS.default,
                agent_id: SCAgent.aid,
                desc: 'dfdfdf #$#$ sds sd434343',
                status: 2
              }
            ]
          },{
            product_id: productIds[1],
            product_instance_id: productInstanceIds[0],
            tickets: [ 
              {
                receiver_id: warehouses.find(x => x.is_hub)._id,
                status: _const.ORDER_STATUS.default,
                agent_id: SalesManager.aid,
                desc: 'asas##$ sdsd 3423 232',
                status: 2
              }
            ]
          }]
        }];
        return models['OrderTest'].insertMany(orders);

      })
      .then(res => {
        orderId = res[0]._id;
        orderLineId = res[0].order_lines[0]._id;

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });

  });

  it('expect all ticket for each orderline', function (done) {
    this.done = done;

    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL(`order/ticket/history/${orderId}/${orderLineId}`),
      body: {},
      json: true,
      resolveWithFullResponse: true,
      jar: SalesManager.jar
    })
    .then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body[0]._id).toEqual(orderId.toString());
      expect(res.body[0].tickets.length).toBe(2);
      done();
    })
    .catch(lib.helpers.errorHandler.bind(this));
  });

  
  it('expect error when orderId not valid', function (done) {
    this.done = done;
    orderId = orderId + 'A';
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL(`order/ticket/history/${orderId}/${orderLineId}`),
      body: {},
      json: true,
      resolveWithFullResponse: true,
      jar: SalesManager.jar
    })
    .then(res => {
      this.fail('expect error when orderId not valid');
      done();
    })
    .catch(err => {
      expect(err.statusCode).toBe(error.invalidId.status);
      expect(err.error).toBe(error.invalidId.message);
      done();
    });
  });

  it('expect error when orderLineId not valid', function (done) {
    this.done = done;
    orderLineId = orderLineId + 'A';
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL(`order/ticket/history/${orderId}/${orderLineId}`),
      body: {},
      json: true,
      resolveWithFullResponse: true,
      jar: SalesManager.jar
    })
    .then(res => {
      this.fail('expect error when orderLineId not valid');
      done();
    })
    .catch(err => {
      expect(err.statusCode).toBe(error.invalidId.status);
      expect(err.error).toBe(error.invalidId.message);
      done();
    });
  });
});