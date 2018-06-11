const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const error = require('../../../lib/errors.list');

describe("GET Tickets", () => {

  let  customerObj = {
    cid: null,
    jar: null
  }

  let productIds = [];
  let productInstanceIds = [];
  let order, orderLineOne, orderLineTwo;

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
    colors: [{
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
        }, {
          count: 2,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
          count: 3,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
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
        }, {
          count: 3,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
          count: 4,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
          count: 5,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }]
      }
    ]
  }, {
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
    colors: [{
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
        }, {
          count: 2,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
          count: 3,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
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
        }, {
          count: 3,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
          count: 4,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }, {
          count: 5,
          reserved: 0,
          warehouse_id: mongoose.Types.ObjectId()
        }]
      }
    ]
  }];
  
  let salesManagerObject = {
    active : true,
    username : "admin@persianmode.com",
    secret : "123456789",
    access_level : 1,
    first_name : "Sales",
    surname : "Manager",
  }

  beforeEach(done => {

    lib.dbHelpers.dropAll()
      .then(() => models['WarehouseTest'].insertMany(warehouses))
      .then(() => models['AgentTest'].create(salesManagerObject))
      .then(() => lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {addresses: [address]}))
      .then((customer) => {
        customerObj.cid = customer.cid;
        customerObj.jar = customer.rpJar;
        return models['ProductTest'].insertMany(products);
      })
      .then(res => {
        productIds = res.map(el => el._id);
        productInstanceIds = res[0].instances.map(el => el._id);
        return [{
          customer_id: customerObj.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: []
          },{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [{
              is_processed : false,
              status : 4,
              desc : null,
              receiver_id : mongoose.Types.ObjectId(),
              timestamp : new Date()
            },{
              is_processed : true,
              status : 12,
              desc : null,
              receiver_id : mongoose.Types.ObjectId(),
              timestamp : new Date()
            }]
          }]
        }];
      })
      .then((orders) => models['OrderTest'].insertMany(orders))
      .then(res => {
        order = res[0];
        orderLineOne = res[0].order_lines[0];
        orderLineTwo = res[0].order_lines[1];
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('expect set ticket', function (done) {
    this.done = done;
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/return`),
        body: {
          order,
          orderLine: orderLineOne,
          desc: {
            time_slot: '18-22',
            day: new Date()
          }
        },
        json: true,
        resolveWithFullResponse: true
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
      })
      .then(() => models['OrderTest'].findOne({'_id': order._id, 'order_lines._id': orderLine._id}))
      .then((res) => {
        expect(res.order_lines[0].tickets.length).toEqual(1)
        expect(res.order_lines[0].tickets[0].desc.time_slot).toBe('18-22');
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when orderId not valid', function (done) {
    this.done = done;
    order = JSON.parse(JSON.stringify(order))
    order['_id'] = order._id + 'A';
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/return`),
        body: {
          order,
          orderLine,
          desc: {
            time_slot: '18-22',
            day: new Date()
          }
        },
        json: true,
        resolveWithFullResponse: true
      })
      .then(res => {
        this.fail('expect error when order not valid');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidId.status);
        expect(err.error).toBe(error.invalidId.message);
        done();
      });
  });

  it('expect error when orderlineId not valid', function (done) {
    this.done = done;
    orderLine = JSON.parse(JSON.stringify(orderLine))
    orderLineOne['_id'] = orderLine._id + 'A';

    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/return`),
        body: {
          order,
          orderLine,
          desc: {
            time_slot: '18-22',
            day: new Date()
          }
        },
        json: true,
        resolveWithFullResponse: true
      })
      .then(res => {
        this.fail('expect error when orderlineId not valid');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidId.status);
        expect(err.error).toBe(error.invalidId.message);
        done();
      });
  });

  it('expect error when orderline ticket is_process true', function (done) {
    this.done = done;
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/return`),
        body: {
          order,
          orderLine: orderLineTwo,
          desc: {
            time_slot: '18-22',
            day: new Date()
          }
        },
        json: true,
        resolveWithFullResponse: true
      })
      .then(res => {
        this.fail('expect error when orderline ticket is_process true');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.ticketAlreadyInProcess.status);
        expect(err.error).toBe(error.ticketAlreadyInProcess.message)
        done();
      });
  });
});