const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const env = require('../../../env');
const moment = require('moment');
const dailyReportHour = env.dailyReportHour;

describe('Get User All Orders', () => {
  let customerObj = {
    cid: null,
    jar: null
  };
  let type1, brand1;
  let products = [];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let ticket = {
    warehouse_id: mongoose.Types.ObjectId(),
    status: 1,
    desc: "descccc",
    timeStamp: new Date(),
    is_processed: false,
    referral_advice: 1123,
    agent_id: mongoose.Types.ObjectId()
  };
  let existingOrderId;
  let firstOrder;
  let secondOrder;
  let thirdOrder;
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


  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() =>
        lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {
          addresses: [address]
        }))
      .then(res => {
        models()['CustomerTest'].find({_id: res.cid}).then(r => {
        }).catch(e => console.log(e));
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;
        type1 = models()['ProductTypeTest']({
          name: 'type1'
        });
        brand1 = models()['BrandTest']({
          name: 'Nike'
        });

        return Promise.all([type1.save(), brand1.save()]);
      })
      .then(() => {
        products.push(models()['ProductTest']({
          _id: productIds[0],
          article_no: 'vvvvv',
          name: 'sample name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id
          },
          base_price: 30000,
          desc: 'some description for this product',
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: mongoose.Types.ObjectId(),
              size: "9",
              price: 2000,
              barcode: '0394081341'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: mongoose.Types.ObjectId(),
              size: "10",
              price: 4000,
              barcode: '19231213123'
            }
          ]
        }));
        products.push(models()['ProductTest']({
          _id: productIds[1],
          article_no: 'qqqqq',
          name: 'another simple name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id,
          },
          base_price: 600000,
          desc: "some else description for this product",
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: mongoose.Types.ObjectId(),
              size: "11",
              price: 50000,
              barcode: '9303850203'
            }
          ]
        }));
        return Promise.all([products[0].save(), products[1].save()]);
      })
      .then(() => {
        firstOrder = {
          customer_id: customerObj.cid,
          is_cart: false,
          transaction_id: mongoose.Types.ObjectId(),
          address: address,
          total_amount: 5000,
          used_point: 2200,
          used_balance: 2400,
          order_time: new Date(),
          is_collect: false,
          coupon_code: '12345abcde',
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [ticket]
          }, {
            tickets: [ticket],
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1]
          }]
        };
        return models()['OrderTest'].insertMany([firstOrder]);
      })
      .then(res => {
        existingOrderId = res[0]._id;
        secondOrder = {
          customer_id: customerObj.cid,
          is_cart: false,
          transaction_id: mongoose.Types.ObjectId(),
          address: address,
          total_amount: 4000,
          used_point: 1200,
          used_balance: 1400,
          order_time: new Date(),
          is_collect: true,
          coupon_code: 'abcde12345',
          order_lines: [{
            tickets: [ticket],
            product_id: productIds[1],
            product_instance_id: productInstanceIds[2]
          }]
        };

        return models()['OrderTest'].insertMany([secondOrder])
      }).then(res => {
      existingOrderId = res[0]._id;
      thirdOrder = {
        customer_id: customerObj.cid,
        is_cart: true,
        transaction_id: mongoose.Types.ObjectId(),
        address: address,
        total_amount: 3000,
        used_point: 200,
        used_balance: 400,
        order_time: new Date(),
        is_collect: false,
        coupon_code: '123456789',
        order_lines: [{
          tickets: [ticket],
          product_id: productIds[1],
          product_instance_id: productInstanceIds[2]
        }]
      };

      return models()['OrderTest'].insertMany([thirdOrder])
    })
      .then(() => {
        return models()['CustomerTest'].update({_id: customerObj.cid}, {$addToSet: {orders: existingOrderId}});
      })
      .then(() => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should return user two order', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL('orders'),
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.orders.length).toBe(2);
      expect(res.body.orders[0].transaction_id).toEqual(secondOrder.transaction_id.toString());
      expect(res.body.orders[1].transaction_id).toEqual(firstOrder.transaction_id.toString());
      expect(res.body.orders[0].total_amount).toEqual(secondOrder.total_amount);
      expect(res.body.orders[0].used_point).toEqual(secondOrder.used_point);
      expect(res.body.orders[0].used_balance).toEqual(secondOrder.used_balance);
      expect(res.body.orders[0].order_lines[0].product.name).toEqual(products[1].name);
      expect(res.body.orders[1].order_lines[0].product.name).toEqual(products[0].name);
      expect(res.body.orders[1].order_lines[1].product.name).toEqual(products[0].name);
      expect(res.body.orders[1].order_lines[1].product_instance.barcode).toEqual(products[0].instances[1].barcode);
      expect(res.body.orders[1].order_lines[1].tickets[0].referral_advice).toEqual(ticket.referral_advice);


      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});

describe('Get Daily Sales Report for sales manager', () => {
  let customerObj = {
    cid: null,
    jar: null
  };
  let SalesManagerObj = {
    aid: null,
    jar: null
  };
  let order1, order2, order3;

  let today = moment(moment().format('YYYY-MM-DD')).set({
    'hour': dailyReportHour,
    'minute': '00',
    'second': '00'
  }).toDate();

  let yesterday = moment(moment().add(-1, 'd').format('YYYY-MM-DD')).set({
    'hour': dailyReportHour,
    'minute': '00',
    'second': '00'
  }).toDate();

  let day = moment(moment().add(-2, 'd').format('YYYY-MM-DD')).set({
    'hour': dailyReportHour,
    'minute': '00',
    'second': '00'
  }).toDate();

  let firstOrder = {
    customer_id: mongoose.Types.ObjectId(),
    is_cart: false,
    transaction_id: mongoose.Types.ObjectId(),
    address: {
      province: "aa",
      city: "aa",
      district: "aaa",
      street: "aa",
      unit: "1",
      no: "1",
      postal_code: "111",
      loc: {
        long: 11,
        lat: 11,
      }
    },
    total_amount: 1,
    used_point: 1,
    used_balance: 1,
    order_time: today,
    is_collect: false,
    coupon_code: '1111',
    order_lines: []
  };
  let secondOrder = {
    customer_id: mongoose.Types.ObjectId(),
    is_cart: false,
    transaction_id: mongoose.Types.ObjectId(),
    address: {
      province: "b",
      city: "b",
      district: "b",
      street: "b",
      unit: "2",
      no: "2",
      postal_code: "22",
      loc: {
        long: 22,
        lat: 22,
      }
    },
    total_amount: 2,
    used_point: 2,
    used_balance: 2,
    order_time: day,
    is_collect: false,
    coupon_code: '2222',
    order_lines: []
  };
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
  let warehouses = [{
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

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();
      const customerLoggedIn = await lib.dbHelpers.addAndLoginCustomer('test@test', "123456", {
        addresses: [address]
      });
      let customer = await models()['CustomerTest'].find({_id: customerLoggedIn.cid});

      const salesManager = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(x => x.is_hub)._id);
      SalesManagerObj.jar = salesManager.rpJar;

      order1 = await models()['OrderTest'].insertMany([firstOrder]);
      order2 = await models()['OrderTest'].insertMany([secondOrder]);

      done();
    }
    catch (error) {
      console.log('error->', error);
      done();
    }
  }, 15000);

  it('should be return orders that have be between (order_time)  ', async function (done) {
    try {
      this.done = done;
      const res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL('daily_sales_report'),
        jar: SalesManagerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);

      const orders = await  models()['OrderTest'].find();

      done();
    }
    catch (error) {
      lib.helpers.errorHandler.bind(this)(error)
    }
  });

});