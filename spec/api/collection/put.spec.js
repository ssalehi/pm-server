const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');


describe('PUT Collection', () => {

  let productIdsArr = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let productTypesArr = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let newTypesArr = [];
  newTypesArr[0] = productTypesArr[0];
  newTypesArr[1] = productTypesArr[1];
  newTypesArr[2] = mongoose.Types.ObjectId();
  let tagGroupsArr = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let newTagGroupsArr = [];
  newTagGroupsArr[0] = tagGroupsArr[1];
  let collectionIds = [];
  let adminObj = {
    aid: null,
    jar: null
  };
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        let collectionArr = [{
          name: 'manual',
          is_smart: false,
          productIds: productIdsArr
        }, {
          name: 'smart',
          is_smart: true,
          typeIds: productTypesArr,
          tagGroupIds: tagGroupsArr,
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

  it('should add a new collection ', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL('collection'),
      body: {
        // _id: collectionIds[0],
        name: 'collection three',
        productIds: [
          productIdsArr[0],
        ]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].find();
    }).then(res => {

      expect(res.length).toEqual(3);
      expect(res[2].productIds).toContain(productIdsArr[0]);
      expect(res[2].productIds.length).toEqual(1);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should update collection when body has _id ', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL('collection'),
      body: {
        _id: collectionIds[0],
        name: 'changedName',
        is_smart: true
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].find();
    }).then(res => {

      expect(res.length).toBe(2);
      expect(res[0]._id).toEqual(collectionIds[0]);
      expect(res[0].name).toEqual('changedName');
      expect(res[0].productIds.length).toEqual(3);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when name of collection is not defined', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection`),
      body: {
        // name: 'second name',
        productIds: [
          productIdsArr[0],
        ]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when name of collection is not defined');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.CollectionNameRequired.status);
      expect(err.error).toBe(error.CollectionNameRequired.message);
      done();
    });
  });

  it('should update tagGroups and types', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection/detail/${collectionIds[1]}`),
      body: {
        typeIds: newTypesArr,
        tagGroupIds: newTagGroupsArr
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].find({_id: collectionIds[1]});
    }).then(res => {
      res = res[0];

      expect(res.name).toBe('smart');
      expect(res.typeIds.length).toBe(3);
      expect(res.tagGroupIds.length).toBe(1);

      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });

});
