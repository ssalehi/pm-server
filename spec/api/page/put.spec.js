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
        console.error(err);
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

describe("Put Placement Api", () => {
  let page, collection_id, contentManager;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('cm');
      })
      .then(res => {
        contentManager = res;

        collection_id = new mongoose.Types.ObjectId();

        page = models['PageTest']({
          address: 'test',
          is_app: false,
          placement: [
            {
              "component_name": "menu",
              "variable_name": "topMenu",
              "info": {
                "column": "0",
                "text": "مردانه",
                "href": "collection/men"
              }
            },
            {
              "component_name": "menu",
              "variable_name": "subMenu",
              "info": {
                "section": "men/header",
                "column": 1,
                "row": 1,
                "text": "تازه‌ها",
                "href": "collection/x"
              }
            },
            {
              "component_name": "menu",
              "variable_name": "subMenu",
              "info": {
                "section": "men/header",
                "column": 1,
                "row": 3,
                "text": "مجموعه Equality",
                "href": "#"
              }
            },
            {
              "component_name": "menu",
              "variable_name": "topMenu",
              "info": {
                "column": "1",
                "text": "زنانه",
                "href": "collection/women"
              }
            },
            {
              "component_name": "menu",
              "variable_name": "topMenu",
              "info": {
                "column": "2",
                "text": "دخترانه",
                "href": "collection/girls"
              }
            },
            {
              "component_name": "menu",
              "variable_name": "topMenu",
              "info": {
                "column": "3",
                "text": "پسرانه",
                "href": "collection/boys"
              }
            }
          ],
          page_info: {
            collection_id: collection_id,
            content: 'sample content'

          }
        });

        return page.save()

      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.err(err);
        done();
      });
  });

  it('should add new placement to page (add placement without setting column)', function (done) {
    this.done = done;
    rp({
      method: 'put',
      body: {
        page_id: page._id,
        placement: {
          component_name: 'menu',
          variable_name: 'topMenu',
          info: {
            text: 'بچه سال',
            href: 'kids',
            column: 4,
          },
        }
      },
      uri: lib.helpers.apiTestURL('placement'),
      json: true,
      resolveWithFullResponse: true,
      jar: contentManager.rpJar,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['PageTest'].find({
          '_id': page._id,
        }).lean();
      })
      .then(res => {
        expect(res.length).toBe(1);
        res = res[0].placement.filter(el => el.component_name === 'menu' && el.variable_name === 'topMenu');
        expect(res.length).toBe(5);
        res = res.find(el => el.info.href === 'kids');
        expect(res.info.text).toBe('بچه سال');
        expect(res.info.column).toBe(4);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when adding a placement without specified page id', function (done) {
    rp({
      method: 'put',
      body: {
        placement: {
          component_name: 'menu',
          variable_name: 'topMenu',
          info: {
            text: 'بچه سال',
            href: 'kids',
          },
        }
      },
      uri: lib.helpers.apiTestURL('placement'),
      json: true,
      resolveWithFullResponse: true,
      jar: contentManager.rpJar,
    })
      .then(res => {
        this.fail('Content Manager can add placement without specified page id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.pageIdRequired.status);
        expect(err.error).toBe(error.pageIdRequired.message);
        done();
      });
  });

  it('should get error when adding a placement without specified placement details', function (done) {
    rp({
      method: 'put',
      body: {
        page_id: page._id,
        placement: {
          variable_name: 'topMenu',
          info: {
            text: 'بچه سال',
            href: 'kids',
          },
        }
      },
      uri: lib.helpers.apiTestURL('placement'),
      json: true,
      resolveWithFullResponse: true,
      jar: contentManager.rpJar,
    })
      .then(res => {
        this.fail('Content Manager can add placement without specified placement general details');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.placementDetailsRequired.status);
        expect(err.error).toBe(error.placementDetailsRequired.message);
        done();
      });
  });

  it("should get error when adding placement with same href and text", function (done) {
    rp({
      method: 'put',
      body: {
        page_id: page._id,
        placement: {
          "component_name": "menu",
          "variable_name": "topMenu",
          "info": {
            "text": "دخترانه",
            "href": "collection/girls",
            "column": 5,
          },
        }
      },
      jar: contentManager.rpJar,
      json: true,
      uri: lib.helpers.apiTestURL('placement'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Content manager can add duplicated placement');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.duplicatePlacement.status);
        expect(err.error).toBe(error.duplicatePlacement.message);
        done();
      });
  });
});