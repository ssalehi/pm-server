const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Collection/Products', () => {

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {

    }).catch(err => {
      console.log(err);
      done();
    });
  });


});