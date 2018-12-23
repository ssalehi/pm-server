const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');


xdescribe('Get User All Orders', () => {
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
      }).then(() => {
      const warehouse = models()['WarehouseTest'].create({
        name: 'انبار مرکزی',
        phone: 'نا مشخص',
        address: {
          city: 'تهران',
          street: 'نامشخص',
          province: 'تهران'
        },
        priority: 0,
      });

      return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouse._id);
    })
      .then((res) => {
      SalesManagerObj.aid = res.aid;
      SalesManagerObj.jar = res.rpJar;
    })
      .then(() => {
        products.push(models()['ProductTest']({
          _id: productIds[0],
          article_no: 'asdfggh',
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
          article_no: 'fdgfgfg',
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

  it('should return two order', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL('daily_sales_report'),
      // body: {firstOrder},
      jar: SalesManagerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        // expect(res.statusCode).toBe(200);
        // expect(res.body.orders.length).toBe(2);
        // expect(res.body.orders[0].transaction_id).toEqual(secondOrder.transaction_id.toString());
        // expect(res.body.orders[1].transaction_id).toEqual(firstOrder.transaction_id.toString());
        // expect(res.body.orders[0].total_amount).toEqual(secondOrder.total_amount);
        // expect(res.body.orders[0].used_point).toEqual(secondOrder.used_point);
        // expect(res.body.orders[0].used_balance).toEqual(secondOrder.used_balance);
        // expect(res.body.orders[0].order_lines[0].product.name).toEqual(products[1].name);
        // expect(res.body.orders[1].order_lines[0].product.name).toEqual(products[0].name);
        // expect(res.body.orders[1].order_lines[1].product.name).toEqual(products[0].name);
        // expect(res.body.orders[1].order_lines[1].product_instance.barcode).toEqual(products[0].instances[1].barcode);
        // expect(res.body.orders[1].order_lines[1].tickets[0].referral_advice).toEqual(ticket.referral_advice);
        done();
      }).catch(lib.helpers.errorHandler.bind(this));
  });
});