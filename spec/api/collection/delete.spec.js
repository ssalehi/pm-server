const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');


describe('DELETE Collection', () => {

  let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let tagIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        let collectionArr = [{
          name: 'man1',
          is_smart: false,
          productIds: [productIds[0], productIds[1], productIds[2]]
        }, {
          name: 'man2',
          is_smart: true,
          tagIds: [tagIds[0], tagIds[1]]
        }];
        models['CollectionTest'].insertMany(collectionArr).then(res => {
          collectionIds[0] = res[0]._id;
          collectionIds[1] = res[1]._id;

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
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].find();
    }).then(res => {
      expect(res.length).toEqual(1);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/1`),
      jar: adminObj.jar,
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

  it('should delete product from collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/${productIds[0]}`),
      jar: adminObj.jar,
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

  it('should delete tag from collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/tag/${collectionIds[1]}/${tagIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].findById(collectionIds[1]);
    }).then(res => {
      expect(res.tagIds.length).toBe(1);
      expect(res.tagIds).toNotContain(tagIds[0]);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when params cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/1/${productIds[0]}`),
      jar: adminObj.jar,
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
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/2`),
      jar: adminObj.jar,
    }).then(res => {
      this.fail('expect error when params pid is not valid');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.productIdIsNotValid.status);
      expect(err.error).toEqual(error.productIdIsNotValid.message);
      done();
    });
  });

  it('expect error when params tid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/tag/${collectionIds[1]}/2`),
      jar: adminObj.jar,
    }).then(res => {
      this.fail('expect error when params tid is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.TagIdIsNotValid.status);
      expect(err.error).toEqual(error.TagIdIsNotValid.message);
      done();
    });
  });

});