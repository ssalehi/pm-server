const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');


describe('PUT Upload', () => {

  beforeEach(done => {
    lib.dbHelpers.dropAll().then();
    done();

  });

  it('should upload fill excel ', function (done) {
    this.done = done;
    rp({
      method: 'PUT',
      uri: lib.helpers.apiTestURL(`/upload_excel`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
