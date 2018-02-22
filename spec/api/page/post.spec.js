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


describe("Post page basics", () => {

  let basicPageId;
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
        let basicPage = models['PageTest']({
          address: 'sampleAddress',
          is_app: false,
        });
        return basicPage.save();
      })
      .then(res => {
        basicPageId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should update basic info of product", function (done) {

    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`page/${basicPageId}`),
      body: {
        address: 'changedAddress',
        is_app: true,
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['PageTest'].find({}).lean();

    }).then(res => {
      expect(res[0].address).toBe('changedAddress');
      expect(res[0].is_app).toBe(true);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
