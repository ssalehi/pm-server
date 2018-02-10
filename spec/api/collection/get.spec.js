const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('GET Collection', () => {
  let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      let collectionArr = [{
        name: 'collection one ',
        image_url: mongoose.Types.ObjectId(),
        productIds: [productIds[0], productIds[1], productIds[2]]
      }, {
        name: 'collection two ',
        image_url: mongoose.Types.ObjectId(),
        productIds: []
      }];
      models['CollectionTest'].insertMany(collectionArr).then(res => {
        collectionIds[0] = res[0]._id;

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


});