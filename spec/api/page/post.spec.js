const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe('Post page basics', () => {

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

  it('should update basic info of page', function (done) {

    this.done = done;
    let collectionId = new mongoose.Types.ObjectId();

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`page/${basicPageId}`),
      body: {
        address: 'changedAddress',
        is_app: true,
        collection_id: collectionId
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['PageTest'].find({}).lean();

    }).then(res => {
      console.log('-> ', res);
      expect(res[0].address).toBe('changedAddress');
      expect(res[0].is_app).toBe(true);
      expect(res[0].page_info.collection_id.toString()).toBe(collectionId.toString());
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});

describe('Post page placements and page info', () => {
  let page, collection_id;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        let inserts = [];
        collection_id = new mongoose.Types.ObjectId();

        page = models['PageTest']({
          address: 'test',
          is_app: false,
          placement: [
            {
              component_name: 'main'
            },
            {
              component_name: 'slider'
            },
            {
              component_name: 'menu'
            },
            {
              component_name: 'slider'
            },
            {
              component_name: 'main'
            },
            {
              component_name: 'menu'
            },
            {
              component_name: 'menu'
            },
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
        console.log(err);
        done();
      });
  });

  it('should get page placements and page info of a website page using its address', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`page`),
      body: {
        address: page.address
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = res.body;
      expect(result.placement.length).toBe(7);
      expect(result.page_info.collection_id.toString()).toBe(collection_id.toString());
      expect(result.page_info.content).toBe('sample content');
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});

describe('POST placement (top menu)', () => {
  let page, collection_id;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        let inserts = [];
        collection_id = new mongoose.Types.ObjectId();

        page = models['PageTest']({
          address: 'test',
          is_app: false,
          placement: [
            {
              component_name: 'main'
            },
            {
              component_name: 'slider'
            },
            {
              component_name: 'menu'
            },
            {
              component_name: 'slider'
            },
            {
              component_name: 'main'
            },
            {
              component_name: 'menu'
            },
            {
              component_name: 'menu'
            },
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
        console.log(err);
        done();
      });
  });

  it('should add new placement to page', function (done) {

  });

  it('should get error when adding a placement without specified page id', function (done) {

  });

  it('should apply reordering to the top menu items', function (done) {

  });

  it('should update the placement details', function (done) {

  });
});
