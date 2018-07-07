const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const error = require('../../../lib/errors.list');

xdescribe("POST Tickets Return", () => {

  let customerAddressId;
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
          delivery_slot: 'delivery_slot 001',
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [{
              is_processed : true,
              status : 12,
              desc : null,
              receiver_id : mongoose.Types.ObjectId(),
              timestamp : new Date()
            }]
          },{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [{
              is_processed : true,
              status : 4,
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
      })
      .then(() => models['CustomerTest'].findOne({username: 'test@test'}))
      .then((customer) => {
        customerAddressId = customer.addresses[0]._id
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
          orderId: order._id,
          orderLineId: orderLineOne._id,
          desc: {
            day: {
              time_slot: '18-22',
              day_slot: new Date()
            },
            address_id: customerAddressId
          }
        },
        json: true,
        resolveWithFullResponse: true
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
      })
      .then(() => models['OrderTest'].findOne({'_id': order._id, 'order_lines._id': orderLineOne._id}))
      .then((res) => {
        expect(res.order_lines[0].tickets.length).toEqual(2)
        expect(res.order_lines[0].tickets[1].desc.day.time_slot).toBe('18-22');
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
          orderId: order._id,
          orderLineId: orderLineOne._id,
          desc: {
            day: {
              time_slot: '18-22',
              day_slot: new Date()
            },
            address_id: customerAddressId
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
    orderLineOne = JSON.parse(JSON.stringify(orderLineOne))
    orderLineOne['_id'] = orderLineOne._id + 'A';

    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/return`),
        body: {
          orderId: order._id,
          orderLineId: orderLineOne._id,
          desc: {
            day: {
              time_slot: '18-22',
              day_slot: new Date()
            },
            address_id: customerAddressId
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

  it('expect error when orderline ticket status is Delivered ', function (done) {
    this.done = done;
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/return`),
        body: {
          orderId: order._id,
          orderLineId: orderLineTwo._id,
          desc: {
            day: {
              time_slot: '18-22',
              day_slot: new Date()
            },
            address_id: customerAddressId
          }
        },
        json: true,
        resolveWithFullResponse: true
      })
      .then(res => {
        this.fail('expect error when orderline ticket status is Delivered');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.ticketStatusNotDelivered.status);
        expect(err.error).toBe(error.ticketStatusNotDelivered.message)
        done();
      });
  });
  
});
describe("POST Tickets Cancel", () => {

  let customerAddressId;
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
        size: "10",
        article_no: "aaaa",
        price: 1000,
        barcode: '22222222',
        inventory: [{
          count: 2,
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
        size: "11",
        article_no: "nnnnn",
        price: 2000,
        barcode: '11111111',
        inventory: [{
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
      .then(() => lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {balance: 500, mobile_no: '09123456789', loyalty_points: 10, addresses: [address]}))
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
          delivery_slot: 'delivery_slot 002',
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            // orderline 1  - dont have status delivery or ondelivery 
            // OnDelivery: 11,
            // Delivered: 12,
            product_id: productIds[0],
            paid_price : 1000,
            product_instance_id: productInstanceIds[0],
            tickets: [{
              is_processed : true,
              status : 4,
              desc : null,
              receiver_id : mongoose.Types.ObjectId(),
              timestamp : new Date()
            }]
          },{
            // orderline 2
            product_id: productIds[0],
            paid_price : 2000,
            product_instance_id: productInstanceIds[1],
            tickets: [{
              is_processed : true,
              status : 3,
              desc : null,
              receiver_id : mongoose.Types.ObjectId(),
              timestamp : new Date()
            },{
              is_processed : true,
              status : 11,
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
      })
      .then(() => models['CustomerTest'].findOne({username: 'test@test'}))
      .then((customer) => {
        customerAddressId = customer.addresses[0]._id
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('expect set ticket cancel when orderline dont have tickets with status is not OnDelivery or Delivered', function (done) {
    this.done = done;
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/cancel`),
        body: {
          orderId: order._id,
          orderLineId: orderLineOne._id,
        },
        json: true,
        resolveWithFullResponse: true,
        jar: customerObj.jar
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
      })
      .then(() => models['CustomerTest'].findById(customerObj.cid))
      .then((customer) => {
        expect(customer.first_name).toBe('test first name');
        expect(customer.balance).toBe(1500);
      })
      .then(() => models['OrderTest'].findOne({'_id': order._id, 'order_lines._id': orderLineOne._id}))
      .then(order => {
        expect(order.order_lines[0].paid_price).toBe(1000);
        expect(order.order_lines[0].tickets.length).toBe(2);
        expect(order.order_lines[0].tickets[1].status).toBe(15);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  xit('expect error when orderline have ticket status is OnDelivery or Delivered', function (done) {
    this.done = done;
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/cancel`),
        body: {
          orderId: order._id,
          orderLineId: orderLineTwo._id
        },
        json: true,
        resolveWithFullResponse: true,
        jar: customerObj.jar
      })
      .then(res => {
        this.fail('expect error when orderline have ticket status is OnDelivery or Delivered');
        done()
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.ticketAlreadySetOnDelivery.status);
        expect(err.error).toBe(error.ticketAlreadySetOnDelivery.message)
        done();
      });
  });

  xit('expect error when orderId not valid', function (done) {
    this.done = done;
    order = JSON.parse(JSON.stringify(order))
    order['_id'] = order._id + 'A';
    
    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/cancel`),
        body: {
          orderId: order._id,
          orderLineId: orderLineOne._id,
        },
        json: true,
        resolveWithFullResponse: true,
        jar: customerObj.jar
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

  xit('expect error when orderlineId not valid', function (done) {
    this.done = done;
    orderLineOne = JSON.parse(JSON.stringify(orderLineOne))
    orderLineOne['_id'] = orderLineOne._id + 'A';

    rp({
        method: "POST",
        uri: lib.helpers.apiTestURL(`order/cancel`),
        body: {
          orderId: order._id,
          orderLineId: orderLineOne._id,
        },
        json: true,
        resolveWithFullResponse: true,
        jar: customerObj.jar
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
  
});