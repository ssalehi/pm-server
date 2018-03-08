const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('DELETE Order', () => {

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
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
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
      },
      {
        inventory: [],
        _id: productInstanceIds[2],
        product_color_id: mongoose.Types.ObjectId(),
        size: "15",
        price: 3000,
        barcode: "091464436843"
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
        _id: productInstanceIds[3],
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
            product_instance_id: productInstanceIds[0],
          }, {
            product_instance_id: productInstanceIds[0],
          }, {
            product_instance_id: productInstanceIds[0],
          }, {
            product_instance_id: productInstanceIds[1]
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

  it('should remove all orderlines of an instance from an existing order (for second customer)', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[0],
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean()
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_line_ids.length).toBe(1);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[1]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should remove 2 orderlines of an instance from an existing order (for second customer)', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[0],
        number: 2
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean()
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_line_ids.length).toBe(2);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should remove the only orderline of an instance while we give it a number of 2 from an existing order (for second customer)', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[1],
        number: 2
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean()
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_line_ids.length).toBe(3);
        // expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[1]);
        // expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});