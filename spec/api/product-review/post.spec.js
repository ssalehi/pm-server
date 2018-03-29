const rp = require('request-promise');
const mongoose = require('mongoose');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe('POST / Product Reviews -', () => {
  let customerObj = {};
  let brandId;
  let productId;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      // create brand
      models['BrandTest'].create({name: 'Nike'})
        .then(res => {
          brandId = res._id;
          //create product
          models['ProductTest'].create({
            name: 'product test',
            base_price: 1000,
            brand: {
              name: res.name,
              brand_id: brandId
            }
          }).then(res => {
            productId = res._id;
          });
        });
      // user login check
      return lib.dbHelpers.addAndLoginCustomer('farhad', '123456789', {
        first_name: 'test firstName',
        surname: 'test surname'
      });

    }).then(res => {
      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('expect error when product id is not valid', function (done) {
    this.done = done;
    productId = productId + 'A';

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`product/review/${productId}`),
      body: {
        brand:brandId,
        stars_count: 4,
        purchased_confirmed: true,
        comment: 'good product!'
      },
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true
    }).then(() => {
      this.fail('expect error when product id is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.invalidId.status);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when user Person not found', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`product/review/${productId}`),
      body: {},
      json: true,
      // jar: customerObj.jar,
      resolveWithFullResponse: true
    }).then(() => {
      this.fail('expect error when user Person not found');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.noUser.status);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when body is empty ', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`product/review/${productId}`),
      body: {},
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true
    }).then(() => {
      this.fail('expect error when body is empty ');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.bodyRequired.status);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect insert product review', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`product/review/${productId}`),
      body: {
        brand: brandId,
        stars_count: 4,
        purchased_confirmed: true,
        comment: 'good product!'
      },
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['ProductTest'].findById(productId);
    }).then(res=>{
      expect(res._id).toEqual(productId);
      expect(res.reviews.length).toBe(1);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});