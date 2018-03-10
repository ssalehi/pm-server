const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('PUT Order', () => {

  let adminObj = {
    aid: null,
    jar: null
  };

  let customerIds = [];
  let customerArr = [{
    first_name: 'a',
    surname: 'b',
    username: 'un1',
    is_verified: true,
    balance: 20,
    loyalty_points: 10,
  }, {
    first_name: 'c',
    surname: 'd',
    username: 'un2',
    is_verified: true,
    balance: 100,
    loyalty_points: 0,
  }];

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [];
  let productArr = [{
    name: 'sample name',
    product_type: mongoose.Types.ObjectId(),
    brand: mongoose.Types.ObjectId(),
    base_price: 30000,
    desc: 'some description for this product',
    instances: [
      {
        inventory: [],
        _id: productInstanceIds[0],
        product_color_id: mongoose.Types.ObjectId(),
        size: "9",
        price: 20,
        barcode: "091201406845"
      },
      {
        inventory: [],
        _id: productInstanceIds[1],
        product_color_id: mongoose.Types.ObjectId(),
        size: "10",
        price: 30,
        barcode: "091201407132"
      }
    ]
  }, {
    name: 'soomple num',
    product_type: mongoose.Types.ObjectId(),
    brand: mongoose.Types.ObjectId(),
    base_price: 40000,
    desc: 'again some more description for another product',
    instances: [
      {
        inventory: [],
        _id: productInstanceIds[2],
        product_color_id: mongoose.Types.ObjectId(),
        size: 20,
        price: 400000,
        barcode: "02940291039"
      }
    ]
  }];
  let existingOrderId;
  let existingOrderForSecondCustomer;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['CustomerTest'].insertMany(customerArr);
      })
      .then(res => {
        customerIds = res.map(x => x._id);

        existingOrderForSecondCustomer = {
          customer_id: customerIds[1],
          total_amount: 0,
          order_time: new Date(),
          is_cart: true,
          order_line_ids: [{
            product_instance_id: productInstanceIds[0]
          }]
        };

        return models['OrderTest'].insertMany([existingOrderForSecondCustomer]);
      })
      .then(res => {
        existingOrderId = res[0]._id;

        return models['ProductTest'].insertMany(productArr);
      })
      .then(res => {
        productIds = res.map(x => x._id);

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  it('should not do anything because no customer with such customer_id exists', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: mongoose.Types.ObjectId(),
        product_instance_id: productInstanceIds[0]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .catch(res => {
        expect(res.statusCode).toBe(500);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should create an orderline and add it to a new order (for first customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[0],
        product_instance_id: productInstanceIds[0]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({_id: res.body.upserted[0]._id}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[0]);
        expect(res[0].is_cart).toBe(true);
        expect(res[0].order_line_ids.length).toBe(1);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add multiple orderlines and add them to a new order (for first customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[0],
        product_instance_id: productInstanceIds[0],
        number: 4,
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({_id: res.body.upserted[0]._id}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[0]);
        expect(res[0].is_cart).toBe(true);
        expect(res[0].order_line_ids.length).toBe(4);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[2].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[3].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add new orderline to an existing order (for second customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[2]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[1]);
        expect(res[0].order_line_ids.length).toBe(2);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[2]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add multiple orderlines to an existing order (for second customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[2],
        number: 3,
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[1]);
        expect(res[0].order_line_ids.length).toBe(4);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[2]);
        expect(res[0].order_line_ids[2].product_instance_id).toEqual(productInstanceIds[2]);
        expect(res[0].order_line_ids[3].product_instance_id).toEqual(productInstanceIds[2]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});