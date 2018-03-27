const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
describe("Get Page", () => {

  let page1, page2, collection1, collection2, page3;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let inserts = [];
        let n = 0;
        while (n < 5) {
          let newPage = models['PageTest']({
            address: `testAddress${n + 1}`,
            is_app: false,
          });
          inserts.push(newPage.save());
          n++;
        }

        collection1 = models['CollectionTest']({
          name: 'collection1'
        });
        collection2 = models['CollectionTest']({
          name: 'collection2'
        });

        page1 = models['PageTest']({
          address: 'testAddress6',
          is_app: false,
          page_info: {
            collection_id: collection1._id
          }
        });
        page2 = models['PageTest']({
          address: 'testAddress7',
          is_app: true,
          page_info: {
            collection_id: collection2._id,
            content: 'some html content'
          }
        });

        inserts.push([collection1.save(), collection2.save(), page1.save(), page2.save()]);
        return Promise.all(inserts);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get specific page by its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/${page1._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result[0]._id).toBe(page1._id.toString());
      expect(result[0].collection.name).toBe(collection1.name);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should get page info of a page by its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/${page2._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result[0]._id).toBe(page2._id.toString());
      expect(result[0].page_info.content).toBe(page2.page_info.content);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
