const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');


describe('DELETE Collection', () => {

  let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {

      let collectionArr = [{
        name: 'collection one ',
        image_url: 'http://localhost:3000/images/image001.png',
        productIds: [productIds[0], productIds[1], productIds[2]]
      }, {
        name: 'collection two ',
        image_url: 'http://localhost:3000/images/image002.png',
        productIds: []
      }, {
        name: 'collection three ',
        image_url: 'http://localhost:3000/images/image003.png',
      }];
      models['CollectionTest'].insertMany(collectionArr).then(res => {
        collectionIds[0] = res[0]._id;
        collectionIds[1] = res[1]._id;
        collectionIds[2] = res[2]._id;

        done();
      }).catch(err => {
        console.log(err);
        done();
      });
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should delete collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].find();
    }).then(res => {

      expect(res.length).toEqual(2);
      expect(res[0].productIds).toNotContain(productIds[0]);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/1`),
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

  it('should product delete from collection have products', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/${productIds[0]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].findById(collectionIds[0]);
    }).then(res => {

      expect(res.productIds.length).toBe(2);
      expect(res.productIds).toNotContain(productIds[0]);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when params cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/1/${productIds[0]}`)
    }).then(res => {
      this.fail('expect error when params cid is not valid');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.collectionIdIsNotValid.status);
      expect(err.error).toBe(error.collectionIdIsNotValid.message);
      done();
    });
  });

  it('expect error when params pid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[2]}/2`)
    }).then(res => {
      this.fail('expect error when params pid is not valid');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.productIdIsNotValid.status);
      expect(err.error).toEqual(error.productIdIsNotValid.message);
      done();
    });
  });

});