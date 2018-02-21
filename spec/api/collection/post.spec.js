const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('POST Collection/Products and Tags', () => {

    let productIdsArr = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
    let tagsArr = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
    let collectionIds = [];
    let newProduct = mongoose.Types.ObjectId();
    let newTag = mongoose.Types.ObjectId();
    beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let collectionArr = [{
        name: 'man1',
        productIds: productIdsArr
      }, {
        name: 'smart1',
        tagIds: tagsArr
      }];
      models['CollectionTest'].insertMany(collectionArr).then(res => {
        collectionIds[0] = res[0]._id;
        collectionIds[1] = res[1]._id;

        done();
      });
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should add new product to a collection', function (done) {
      this.done = done;
      rp({
          method: 'post',
          uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/${newProduct}`),
          json: true,
          resolveWithFullResponse: true
      }).then(res => {
          expect(res.statusCode).toBe(200);

          expect(res.body.n).toBe(1);

          return models['CollectionTest'].findById(collectionIds[0]);
      }).then(res => {

          expect(res.productIds.length).toEqual(4);
          expect(res.productIds).toContain(newProduct);

          done();
      }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add new tag to a collection', function (done) {
      this.done = done;
      rp({
          method: 'post',
          uri: lib.helpers.apiTestURL(`collection/tag/${collectionIds[1]}/${newTag}`),
          json: true,
          resolveWithFullResponse: true
      }).then(res => {
          expect(res.statusCode).toBe(200);

          expect(res.body.n).toBe(1);

          return models['CollectionTest'].findById(collectionIds[1]);
      }).then(res => {
          expect(res.tagIds.length).toEqual(3);
          expect(res.tagIds).toContain(newTag);

          done();
      }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when cid params is not valid', function (done) {
    this.done = done;
    newProduct = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/product/1/${newProduct}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when cid params is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.collectionIdIsNotValid.status);
      expect(err.error).toEqual(error.collectionIdIsNotValid.message);
      done();
    });
  });

  it('expect error when pid params is not valid', function (done) {
      this.done = done;
      rp({
          method: 'post',
          uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/1`),
          json: true,
          resolveWithFullResponse: true
      }).then(res => {
          this.fail('error when pid is not defined');
          done();
      }).catch(err => {
          expect(err.statusCode).toBe(error.productIdIsNotValid.status);
          expect(err.error).toEqual(error.productIdIsNotValid.message);
          done();
      });
  });
});