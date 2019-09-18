const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const error = require('../../../lib/errors.list');


describe('DELETE Collection', () => {

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
        }];
        models()['CollectionTest'].insertMany(collectionArr).then(res => {
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
      console.log('-> ',res.body);
      return models()['CollectionTest'].find();
    }).then(res => {
      expect(res.length).toEqual(0);
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});
describe('DELETE Collection Type', () => {

  let collectionIds = [];
  let typeIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
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
          typeIds
        }];
        models()['CollectionTest'].insertMany(collectionArr).then(res => {
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

  it('should delete collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}/${typeIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      return models()['CollectionTest'].find();
    }).then(res => {
      expect(res.length).toEqual(1);
      expect(res[0].typeIds.length).toBe(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/type/1/${typeIds[0]}`),
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
  it('should get error when tid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}/1`),
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}/${typeIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});
describe('DELETE Collection Tag', () => {

  let collectionIds = [];
  let tagIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
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
          tagIds
        }];
        models()['CollectionTest'].insertMany(collectionArr).then(res => {
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

  it('should delete collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/tag/${collectionIds[0]}/${tagIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      return models()['CollectionTest'].find();
    }).then(res => {
      expect(res.length).toEqual(1);
      expect(res[0].tagIds.length).toBe(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/tag/1/${tagIds[0]}`),
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
  it('should get error when tid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}/1`),
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}/${tagIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});
describe('DELETE Collection', () => {

  let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
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
          productIds: [productIds[0], productIds[1], productIds[2]]
        }];
        models()['CollectionTest'].insertMany(collectionArr).then(res => {
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
      expect(res.body.n).toBe(1);
      return models()['CollectionTest'].findById(collectionIds[0]);
    }).then(res => {
      expect(res.productIds.length).toBe(2);
      expect(res.productIds.map(x => x.toString())).not.toContain(productIds[0].toString());

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/1/${productIds[0]}`),
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
  it('should get error when tid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/1`),
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}/${productIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});