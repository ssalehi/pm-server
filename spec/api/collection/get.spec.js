const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('GET Collection', () => {
  let productIds = [];
  let collectionIds = [];
  let productTypeIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let brandIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      let productArr = [{
        name: 'product one',
        product_type: productTypeIds[0],
        brand: brandIds[0],
        base_price: 10000,
        desc: 'some description for this product one',
      }, {
        name: 'product two',
        product_type: productTypeIds[1],
        brand: brandIds[1],
        base_price: 20000,
        desc: 'some description for this product two',
      }, {
        name: 'product three',
        product_type: productTypeIds[2],
        brand: brandIds[2],
        base_price: 3000,
        desc: 'some description for this product three',
      }];
      models['ProductTest'].insertMany(productArr).then(res => {
        productIds[0] = res[0]._id;
        productIds[1] = res[1]._id;
        productIds[2] = res[2]._id;

        let collectionArr = [{
          name: 'collection one ',
          image_url: 'http://localhost:3000/images/image001.png',
          productIds: [productIds[0], productIds[1], productIds[2]]
        }, {
          name: 'collection two ',
          image_url: 'http://localhost:3000/images/image002.png',
          productIds: []
          // productIds: [productIds[0], productIds[1], productIds[2]]
        }];
        models['CollectionTest'].insertMany(collectionArr).then(res => {
          collectionIds[0] = res[0]._id;

          done();
        });

      });
    }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('should get all collection', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      // console.log("CollectionTest@@",res.body);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].productIds.length).toBe(3);
      expect(res.body[1].productIds.length).toBe(0);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should return one collection', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      // console.log("CollectionTest@@", res.body);.

      expect(res.statusCode).toBe(200);
      expect(res.body.productIds.length).toBe(3);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/1`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when cid is not valid');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.collectionIdIsNotValid.status);
      expect(err.error).toEqual(error.collectionIdIsNotValid.message);

      done();
    });
  });

  it('expect get all products from collection', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/products/${collectionIds[0]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      // console.log(JSON.stringify(res.body));
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(1);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/products/1`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when cid is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.collectionIdIsNotValid.status);
      expect(err.error).toBe(error.collectionIdIsNotValid.message);
      done();
    });
  });


});