const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');


describe('Put Collection', () => {

  let imageUrl, productId, parentId, letName;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        imageUrl = mongoose.Types.ObjectId();
        productId = mongoose.Types.ObjectId();
        parentId = mongoose.Types.ObjectId();
        letName = 'new collection';

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
      console.log(JSON.stringify(res, null, 2));
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toEqual(letName);
      expect(res.body.productIds[0]).toEqual(productId.toString());

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
      expect(err.statusCode).toBe(error.nameRequired.status);
      expect(err.error).toBe(error.nameRequired.message);
      done();
    });


  });


});
