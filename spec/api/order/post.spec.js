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

  it('should create an orderline and add it to a new order', function (done) {
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
        console.log("@@@", res);
      })
      .catch(lib.helpers.errorHandler.bind(this));
  })

});