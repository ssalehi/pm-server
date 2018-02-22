const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe("Delete a Page", () => {

  let pageId;
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

        let page = models['PageTest']({
          address: 'testAddress',
          is_app: true,
        });
        return page.save();

      })
      .then(res => {
        pageId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should remove an existing page", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`page/${pageId}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['n']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['PageTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(0);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


  it("should return 0 effected document on deleting non existing id", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`page/${mongoose.Types.ObjectId()}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['n']).toBe(0);
      expect(result['ok']).toBe(1);
      return models['PageTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});