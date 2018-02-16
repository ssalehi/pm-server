const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Collection/Products', () => {

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let collectionArr = [{
        name: 'collection 001',
        image_url: 'http://localhost:3000/images/image001'
      }, {
        name: 'collection 002',
        image_url: 'http://localhost:3000/images/image002'
      }, {
        name: 'collection 003',
        image_url: 'http://localhost:3000/images/image003'
      }, {
        name: 'collection 004',
        image_url: 'http://localhost:3000/images/image004'
      }, {
        name: 'collection 005',
        image_url: 'http://localhost:3000/images/image005'
      }, {
        name: 'collection 006',
        image_url: 'http://localhost:3000/images/image006'
      }];
      models['CollectionTest'].insertMany(collectionArr);

      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('expect return all documents that include this name', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search`),
      body: {
        phrase: '00',
        options: {
          target: 'Collection',
          offset: 2,
          limit: 4
        }
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(4);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});