const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');


describe('Put Collection', () => {

  let imageUrl, productId, parentId, letName, collectionId;
  // let productIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        imageUrl = mongoose.Types.ObjectId();
        productId = mongoose.Types.ObjectId();
        parentId = mongoose.Types.ObjectId();
        letName = 'new collection';

        models['CollectionTest'].create({
          name: 'test product add to collection',
          image_url: mongoose.Types.ObjectId(),
          productIds: [mongoose.Types.ObjectId()]
        }).then(res => {
          collectionId = res._id;
        });
        done();
      })
      .catch(err => {
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
        name: letName,
        image_url: imageUrl,
        productIds: [
          productId
        ],
        parent_Id: productId
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      // console.log(JSON.stringify(res, null, 2));

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toEqual(letName);
      expect(res.body.productIds[0]).toEqual(productId.toString());

      return models['CollectionTest'].find();

    }).then(res => {

      // console.log("Create new Collection:@@@@",res);
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when name of collection is not defined', function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection`),
      body: {
        // name: 'second name',
        image_url: imageUrl,
        productIds: [productId]
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not fail when other users are calling api');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual("Collection validation failed: name: Path `name` is required.");
      done();
    });
  });


  it('should added product to collection', function (done) {
    this.done = done;
    productId = mongoose.Types.ObjectId();
    // You can check this product with result collection
    // console.log("___", productId);
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionId}/${productId}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['CollectionTest'].findById(collectionId);
    }).then(res => {
      // console.log("should added product to collection@@@:",res);
      expect(res.productIds.length).toBe(2);
      expect(res.productIds).toContain(productId);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect error when cid params is not valid', function (done) {
    this.done = done;
    productId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection/product/1/${productId}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('error when cid is not defined');
      done();
    }).catch(err => {
      // console.log(err);
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual('Cast to ObjectId failed for value "1" at path "_id" for model "Collection"');
      done();
    });
  });

  it('expect error when pid params is not valid', function (done) {
    this.done = done;
    productId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionId}/1`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('error when pid is not defined');
      done();
    }).catch(err => {
      expect(err.statusCode).toBe(500);
      expect(err.error).toEqual('Cast to ObjectId failed for value "1" at path "productIds"');
      done();
    });
  });


});
