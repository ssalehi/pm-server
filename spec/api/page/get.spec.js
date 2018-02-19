const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
describe("Get products", () => {

  let page1, page2, collection1, collection2;

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


  it("should get first 5 pages order by their address", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/0/5`),
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(5);
      let n = 0;
      while (n < 5) {
        expect(result[n].address).toBe(`testAddress${n + 1}`);
        expect(result[n].is_app).toBe(false);
        n++;
      }
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get 2 pages after offset of 5", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`page/5/5`),
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(2);
      expect(result[0].address).toBe(`testAddress6`);
      expect(result[1].address).toBe(`testAddress7`);
      expect(result[0].collection.name).toBe(`collection1`);
      expect(result[1].collection.name).toBe(`collection2`);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
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

});


