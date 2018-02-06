const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Collection/Products', () => {
  let imageUrls = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let parentIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let collectionIds = [];


  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {

      models['CollectionTest'].insertMany([{
        name: 'collection One',
        image_url: imageUrls[0],
        productIds: [productIds[0], productIds[1]],
        parent_id: null
      }, {
        name: 'collection Two',
        image_url: imageUrls[1],
        productIds: [productIds[0], productIds[2]],
        parentIds: parentIds[0]
      }, {
        name: 'collection Three',
        image_url: imageUrls[2],
        productIds: [productIds[2], productIds[1], productIds[0]],
        parent_id: parentIds[1]
      }]).then(res => {
        collectionIds[2] = res[2]._id;
        done();
      });

    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('expect return all products from collection', function (done) {
    this.done = done;
    console.log("collectionIds", collectionIds);
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/products/${collectionIds[2]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      // console.log("@@@@res spec test", res.body);
      expect(res.statusCode).toBe(200);
      expect(res.body._id).toEqual(collectionIds[2].toString());
      expect(res.body.productIds.length).toBe(3);
      expect(res.body.productIds[2]).toEqual(productIds[0].toString());

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when cid is not valid', function (done) {
    this.done = done;
    // console.log("collectionIds", collectionIds);
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`collection/products/1`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when cid is not valid');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual('Cast to ObjectId failed for value "1" at path "_id" for model "Collection"');
      done();
    });
  });

});