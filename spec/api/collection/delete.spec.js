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
        productIds: [
          {
            _id: productIds[0],
            name: 'product 1'
          },
          {
            _id: productIds[1],
            name: 'product2'
          },
          {
            _id: productIds[2],
            name: 'product3'
          },
        ]
      }]);

    }).then(res => {
      collectionIds[0] = res[0]._id;
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
      // console.log(JSON.stringify(res, null, 2));
      expect(res.statusCode).toBe(200);
      expect(res.body._id).toBe(collectionIds[0].toString());

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should product delete from collection', function (done) {
    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`collection/product/${collectionIds[2]}/${productIds[0]}`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      console.log('ehem', res.body);
      return models['CollectionTest'].find({_id: collectionIds[2]});
    }).then(res => {
      console.log('ohom', res);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));


  });
});