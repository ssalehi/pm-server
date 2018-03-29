const rp = require('request-promise');
const mongoose = require('mongoose');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe('POST / Product Reviews -', () => {
  let adminObj = {
    aid: null,
    jar: null,
  };
  let brandId;
  let productId;
  let reviewId;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then((res) => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
      }).then(() => {
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
            },
          }).then(res => {
            models['ProductTest'].findOneAndUpdate({
              '_id': res._id,
              'reviews.customer_id': {$ne: mongoose.Types.ObjectId(adminObj.aid)}
            }, {
              $addToSet: {
                'reviews': {
                  'customer_id': mongoose.Types.ObjectId(adminObj.aid),
                  'comment': 'Hello Comment'
                }
              }
            }, {new: true}).then(res => {
              reviewId = res.reviews[0]._id;
              productId = res._id;
              done();
            }).catch(err => {
              console.log('err1', err);
              done();
            });
          }).catch(err => {
            console.log('err2', err);
            done();
          });
        });
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('expect error when product id is not valid', function (done) {
    this.done = done;
    productId = productId + 'A';

    rp({
      method: 'DELETE',
      uri: lib.helpers.apiTestURL(`product/review/${productId}/${reviewId}`),
      body: {},
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(() => {
      this.fail('expect error when product id is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.invalidId.status);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when review id is not valid', function (done) {
    this.done = done;
    reviewId = reviewId + 'A';

    rp({
      method: 'DELETE',
      uri: lib.helpers.apiTestURL(`product/review/${productId}/${reviewId}`),
      body: {},
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(() => {
      this.fail('expect error when review id is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.invalidId.status);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when user Person not found', function (done) {
    this.done = done;

    rp({
      method: 'DELETE',
      uri: lib.helpers.apiTestURL(`product/review/${productId}`),
      body: {},
      json: true,
      // jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(() => {
      this.fail('expect error when user Person not found');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.noUser.status);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect delete product view by id', function (done) {
    this.done = done;

    rp({
      method: 'DELETE',
      uri: lib.helpers.apiTestURL(`product/review/${productId}/${reviewId}`),
      body: {},
      json: true,
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['ProductTest'].findById(productId);
    }).then(res => {
      expect(res.reviews.length).toBe(0);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});