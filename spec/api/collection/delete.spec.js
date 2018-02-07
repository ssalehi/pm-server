const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');


describe('DELETE Collection', () => {

  let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let imageUrls = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      // let collection = new models['CollectionTest']({
      //   name: 'delete collection test',
      //   image_url: imageUrl,
      //   productIds: [
      //     productIds[0],
      //     productIds[1],
      //     productIds[2],
      //   ]
      // });
      // return collection.save();
      return models['CollectionTest'].insertMany([{
        name: 'delete collection test1',
        image_url: imageUrls[0],
        productIds: []
      }, {
        name: 'delete collection test2',
        image_url: imageUrls[1],
        productIds: [
          productIds[0],
        ]
      }, {
        name: 'delete collection test3',
        image_url: imageUrls[2],
        productIds: [productIds[0], productIds[1], productIds[2]]
      }]);

    }).then(res => {
      collectionIds[0] = res[0]._id;
      collectionIds[1] = res[1]._id;
      collectionIds[2] = res[2]._id;
      done();
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
      expect(res.body._id).toBe(collectionIds[0].toString());

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
      // console.log("@@@!!!!!!", err.error);
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual(`Cast to ObjectId failed for value "{ _id: '1' }" at path "_id" for model "Collection"`);
      done();
    });
  });

  it('should product delete from collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[2]}/${productIds[0]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['CollectionTest'].findById(collectionIds[2]);
    }).then(res => {
      expect(res.productIds.length).toBe(2);
      expect(res.productIds[0]).not.toEqual(productIds[0]);
      expect(res.productIds[0]).toEqual(productIds[1]);


      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when params cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/1/${productIds[0]}`)
    }).then(res => {
      this.fail('failed when params is not valid');

      done();
    }).catch(err => {
      // console.log("Check Error params cid not valid", err.error);
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual('Cast to ObjectId failed for value "1" at path "_id" for model "Collection"');
      done();
    });
  });

  it('expect error when params pid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[2]}/2`)
    }).then(res => {
      this.fail('failed when params is not valid');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual('Cast to ObjectId failed for value "2" at path "productIds"');
      done();
    });

  });

});