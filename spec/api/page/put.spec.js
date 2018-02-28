const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Put page basics", () => {

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
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should add a new page", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`page`),
      body: {
        address: 'testAddress',
        is_app: false
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      expect(res.body.address).toBe('testAddress');
      expect(res.body.is_app).toBe(false);
      expect(mongoose.Types.ObjectId.isValid(res.body._id)).toBeTruthy();
      return models['PageTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should add a new page joined with a collection id", function (done) {

    this.done = done;

    let collectionId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`page`),
      body: {
        address: 'testAddress',
        is_app: false,
        collection_id: collectionId,
        content: 'some html content'
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['PageTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].page_info.collection_id.toString()).toBe(collectionId.toString());
      expect(res[0].page_info.content.toString()).toBe('some html content');
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should second page when there is already one", function (done) {

    this.done = done;

    let page = new models['PageTest']({
      address: 'testAddress1',
      is_app: false
    });
    page.save()
      .then(res =>
        rp({
          method: 'put',
          uri: lib.helpers.apiTestURL(`page`),
          body: {
            address: 'testAddress2',
            is_app: true
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        })).then(res => {
      expect(res.statusCode).toBe(200);

      return models['PageTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(2);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("expect error when page address is not defined", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`page`),
      body: {
        // address: 'testAddress',
        is_app: true
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.pageAddressRequired.status);
        expect(err.error).toBe(error.pageAddressRequired.message);
        done();
      });

  });
  it("expect error when page type is not defined", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`page`),
      body: {
        address: 'testAddress',
        // is_app: true
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.pageTypeRequired.status);
        expect(err.error).toBe(error.pageTypeRequired.message);
        done();
      });

  });
  it("expect error when page address is duplicated", function (done) {

    this.done = done;

    let page = new models['PageTest']({
      address: 'testAddress',
      is_app: false
    });
    page.save()
      .then(res =>
        rp({
          method: 'put',
          uri: lib.helpers.apiTestURL(`page`),
          body: {
            address: 'testAddress',
            is_app: true
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        })).then(res => {

      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        done();
      });

  });


});



