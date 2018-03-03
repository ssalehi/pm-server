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
    let filename = "spec/api/upload/Data.XLSX";
    rp({
      method: 'PUT',
      uri: lib.helpers.apiTestURL(`/upload_excel`),
      formData: {
        file: {
          value: fs.readFileSync(filename),
          options: {
            filename: 'Data.XLSX',
          }
        }
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let workbook = XLSX.readFile(filename);
      let sheet = workbook.Sheets[workbook.SheetNames[0]];
      let range = XLSX.utils.decode_range(sheet['!ref']);
      let columnT = sheet['!ref'] = `Q2:AA${range.e.r}`;
      let sheetJsonT = XLSX.utils.sheet_to_json(sheet, columnT);
      return Object.keys(sheetJsonT[0]);

    }).then(excelResult => {
      models['TagGroupTest'].find({}).then(res => {
        let query = res.map(r => r.name);
        expect(query.length).toBe(excelResult.length);
        done();
      });

    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
