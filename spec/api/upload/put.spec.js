const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
if (typeof require !== 'undefined') XLSX = require('xlsx');
const fs = require('fs');

describe('PUT Upload', () => {

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      done();
    });
  });

  xit('should error when req.file not valid', function (done) {
    this.done = done;
    rp({
      method: 'PUT',
      uri: lib.helpers.apiTestURL(`/upload_excel`),
      json: true,
      resolveWithFullResponse: true
    }).then((res) => {
      this.fail('should error when req.file not valid');
    }).catch(err => {
      expect(err.statusCode).toBe(error.excelFileRequired.status);
      expect(err.error).toEqual(error.excelFileRequired.message);
      done();
    });
  });

  it('should expect tagGroup inserted', function (done) {
    this.done = done;
    let filename = "spec/api/upload/Original File.XLSX";
    rp({
      method: 'PUT',
      uri: lib.helpers.apiTestURL(`/upload_excel`),
      formData: {
        file: {
          value: fs.readFileSync(filename),
          options: {
            filename: 'Original File.XLSX',
          }
        }
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  }, 20000);



});
