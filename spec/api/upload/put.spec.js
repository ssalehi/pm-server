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
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/uploadData`),
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

  xit('should expect tagGroup inserted', function (done) {
    this.done = done;
    let filename = "spec/api/upload/Original File.XLSX";
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/uploadData`),
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


  it('should expect tagGroup inserted', function (done) {

    this.done = done;

    let data = [
      {data: {name: 'test 1'}},
      {data: {name: 'test 2'}},
      {data: {name: 'test 3'}},
      {data: {name: 'test 4'}},
    ];

    models['TestTest'].insertMany(data)
      .then(res => {
        return models['TestTest'].findOneAndUpdate({}, {

          $addToSet: {

            "data": {name: 'test 1'}
          }

        }, {new: true});
      })
      .then(res => {

        console.log('-> ', res);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  }, 20000);


});
