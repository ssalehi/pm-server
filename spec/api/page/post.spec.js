const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');


xdescribe("Post page basics", () => {

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
describe("Post page placements", () => {

  let page;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        let inserts = [];


        page = models['PageTest']({
          address: 'test',
          is_app: false,
          placement:
              [
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
              ]
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


  it("should get page placements of a page using its address", function (done) {

    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`page/placement/list`),
      body: {
        address: page.address
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = res.body;
      expect(result.placement.length).toBe(7);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});
