const rp = require('request-promise');
const lib = require('../../../lib/index');
const error = require('../../../lib/errors.list');
if (typeof require !== 'undefined') XLSX = require('xlsx');
const fs = require('fs');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const warehouses = require('../../../warehouses');

describe('PUT Upload', () => {
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

        return models()['WarehouseTest'].insertMany(warehouses)
      })
      .then(res => {
        done();
      })
  });

  it('should error when req.file not valid', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/uploadData`),
      json: true,
      jar: adminObj.jar,
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
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
