const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const env = require('../../../env');
const rimraf = require('rimraf');
const copyFileSync = require('fs-copy-file-sync');
const shell = require('shelljs');

describe("Delete Product tags", () => {

  let productId;
  let tagId1, tagId2;
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
        tagId1 = mongoose.Types.ObjectId();
        tagId2 = mongoose.Types.ObjectId();

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          tags: [tagId1, tagId2]

        });
        return product.save();

      })
      .then(res => {
        productId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should remove a existing tag from tags array of product", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/tag/${productId}/${tagId1}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['nModified']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].tags.length).toBe(1);
      expect(res[0].tags[0]).toEqual(tagId2);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should remove a non existing tag from tags array of product", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/tag/${productId}/${mongoose.Types.ObjectId()}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);

      console.log('-> ',result);
      expect(result['nModified']).toBe(0);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].tags.length).toBe(2);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});
