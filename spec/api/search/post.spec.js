const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Search Collection', () => {

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let collectionArr = [{
        name: 'collection 001',
      }, {
        name: 'collection 0012',
      }, {
        name: 'collection 003',
      }, {
        name: 'collection 004',
      }, {
        name: 'collection 005',
      }, {
        name: 'collection 006',
      }];
      models['CollectionTest'].insertMany(collectionArr);
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('expect return all collections when phrase is empty', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/Collection`),
      body: {
        options: {
          phrase: ''
        },
        offset: 0,
        limit: 10
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(6);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('expect return all collections which contains the phrase name', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/Collection`),
      body: {
        options: {
          phrase: '001'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});

describe('POST Search Page', () => {

  let page1, page2, collection1, collection2;

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
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
        done()
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get first 5 pages order by their address", function (done) {

    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: ''
        },
        offset: 0,
        limit: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(5);
      let n = 0;
      while (n < 5) {
        expect(res.body[n].address).toBe(`testAddress${n + 1}`);
        expect(res.body[n].is_app).toBe(false);
        n++;
      }
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get 2 pages after offset of 5", function (done) {

    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: ''
        },
        offset: 5,
        limit: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].address).toBe(`testAddress6`);
      expect(res.body[1].address).toBe(`testAddress7`);
      expect(res.body[0].collection.name).toBe(`collection1`);
      expect(res.body[1].collection.name).toBe(`collection2`);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});