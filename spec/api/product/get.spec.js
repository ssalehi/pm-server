const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Get products", () => {

  let productId1, productId2;
  let type1, type2, brand1, brand2;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        type1 = mongoose.Types.ObjectId();
        type2 = mongoose.Types.ObjectId();
        brand1 = mongoose.Types.ObjectId();
        brand2 = mongoose.Types.ObjectId();

        let product1 = models['ProductTest']({
          name: 'sample name 1',
          product_type: type1,
          brand: brand1,
          base_price: 30000,
          desc: 'some description for this product',
        });
        return product1.save();
      })
      .then(res => {

        productId1 = res._id;
        let product2 = models['ProductTest']({
          name: 'sample name 2',
          product_type: type2,
          brand: brand2,
          base_price: 50000,
          desc: 'some description for this product',
        });
        return product2.save();
      })
      .then(res => {
        productId2 = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get all products", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(2);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get specific product by its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/${productId1}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result._id).toBe(productId1.toString());
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});


