const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe('GET Collection', () => {
  let imageUrls = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let parentId = mongoose.Types.ObjectId();
  let collectionIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      models['CollectionTest'].insertMany([{
        name: 'collection test 1',
        image_url: imageUrls[0],
        // productIds: [mongoose.Types.ObjectId()]
      }, {
        name: 'collection test 2',
        image_url: imageUrls[1],
        productIds: [/*mongoose.Types.ObjectId()*/]
      }, {
        name: 'collection test 3',
        image_url: imageUrls[2],
        productIds: [mongoose.Types.ObjectId()]
      }, {
        name: 'collection test 4',
        image_url: imageUrls[3],
        productIds: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()],
        parent_id: parentId
      }]).then(res => {
        collectionIds[3] = res[3]._id;
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
      console.log("@@@@@@@@@@ without parameter", res.body);

      // expect(res.statusCode).toBe(200);
      // expect(res.body.length).toBe(4);
      // expect(res.body[0].productIds.length).toBe(0);
      // expect(res.body[1].productIds.length).toBe(0);
      // expect(res.body[2].image_url).toEqual(imageUrls[2].toString());
      // expect(res.body[3].parent_id).toEqual(parentId.toString());

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should return one collection', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[3]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.productIds.length).toBe(2);
      expect(res.body.image_url).toEqual(imageUrls[3].toString());
      expect(res.body.parent_id).toEqual(parentId.toString());

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
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual('Cast to ObjectId failed for value "1" at path "_id" for model "Collection"');
      // expect(err.error).toContain('Cast to ObjectId failed for value');

      done();
    });
  });


});