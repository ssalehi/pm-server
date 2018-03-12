const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('POST Collection', () => {

  let collectionIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };
  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let collectionArr = [{
          name: 'collection 1',
        }];
        models['CollectionTest'].insertMany(collectionArr).then(res => {
          collectionIds[0] = res[0]._id;
          done();
        });
      }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should update collection name', function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      body: {
        name: 'changed name'
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['CollectionTest'].findById(res.body._id);
    }).then(res => {

      expect(res.name).toBe('changed name');

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      // jar: adminObj.jar,
      body: {
        name: 'changed name'
      },
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
  it('expect error when cid params is not valid', function (done) {
    this.done = done;
    let newTagId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/1`),
      jar: adminObj.jar,
      body: {
        name: 'changed name'
      },
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

});

describe('POST Collection Tag', () => {

  let tagIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };
  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let collectionArr = [{
          name: 'man1',
          tagIds
        }];
        models['CollectionTest'].insertMany(collectionArr).then(res => {
          collectionIds[0] = res[0]._id;
          done();
        });
      }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('should add new tag to a collection', function (done) {
    this.done = done;

    let newTagId = new mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/tag/${collectionIds[0]}`),
      body: {
        tagId: newTagId
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      expect(res.body.n).toBe(1);

      return models['CollectionTest'].findById(collectionIds[0]);
    }).then(res => {
      expect(res.tagIds.length).toEqual(3);
      expect(res.tagIds).toContain(newTagId);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    let newTagId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      // jar: adminObj.jar,
      body: {
        tagId: newTagId
      },
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
  it('expect error when cid params is not valid', function (done) {
    this.done = done;
    let newTagId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/tag/1`),
      jar: adminObj.jar,
      body: {
        tagId: newTagId
      },
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

});
describe('POST Collection Type', () => {

  let typeIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };
  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let collectionArr = [{
          name: 'man1',
          typeIds
        }];
        models['CollectionTest'].insertMany(collectionArr).then(res => {
          collectionIds[0] = res[0]._id;
          done();
        });
      }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('should add new type to a collection', function (done) {
    this.done = done;

    let newTypeId = new mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}`),
      body: {
        typeId: newTypeId
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      expect(res.body.n).toBe(1);

      return models['CollectionTest'].findById(collectionIds[0]);
    }).then(res => {
      expect(res.typeIds.length).toEqual(3);
      expect(res.typeIds).toContain(newTypeId);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    let newTypeId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/type/${collectionIds[0]}`),
      // jar: adminObj.jar,
      body: {
        typeId: newTypeId
      },
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

  it('expect error when cid params is not valid', function (done) {
    this.done = done;
    let newTypeId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/type/1`),
      jar: adminObj.jar,
      body: {
        typeId: newTypeId
      },
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

});

describe('POST Collection Product', () => {

  let productIdsArr = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  let newProduct = mongoose.Types.ObjectId();
  let adminObj = {
    aid: null,
    jar: null,
  };
  beforeEach((done) => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        let collectionArr = [{
          name: 'man1',
          productIds: productIdsArr
        }];
        models['CollectionTest'].insertMany(collectionArr).then(res => {
          collectionIds[0] = res[0]._id;
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
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}`),
      jar: adminObj.jar,
      body: {
        productId: newProduct
      },
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

  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    let newTypeId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[0]}`),
      // jar: adminObj.jar,
      body: {
        typeId: newTypeId
      },
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

  it('expect error when cid params is not valid', function (done) {
    this.done = done;
    newProduct = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/product/1`),
      jar: adminObj.jar,
      body: {
        productId: newProduct
      },
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

});