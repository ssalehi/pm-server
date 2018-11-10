const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('Warehouse PUT API', () => {
    beforeEach(done => {
      lib.dbHelpers.dropAll()
        .then(res => {
          done();
        })
        .catch(err => {
          console.error('Error in beforeEach block: ', err);
          done();
        });
    });
  
    it('should change priorities', function (done) {
      this.done = done;
      rp({
        method: 'put',
        body: {
            "warehouses":[{
                "_id": "5bd6cde54682480cd8520032",
                "priority": 2,
                "is_active":false
            },
            {
                "_id" : "5bd6cde54682480cd8520030",
             "priority":0,
             "is_active":false
            },
            {
                "_id" : "5bd6cde54682480cd8520031",
                "priority":3,
                "is_active":false
            },{
                "_id" : "5bd6cde54682480cd8520033",
                "priority":1,
                "is_active":false
            },
            {
                "_id" : "5bd6cde54682480cd8520034",
                "priority":4,
                "is_active":false
            }
            ]
        },
        json: true,
        uri: lib.helpers.apiTestURL('warehouse/update'),
        resolveWithFullResponse: true,
      })
        .then(res => {
          expect(res.statusCode).toBe(200);
        // let result = JSON.parse(res.body);  
        //   console.log(result)

        // result.forEach(r => {
        //   expect(warehouseIds.includes(r._id.toString())).toBeTruthy();
        // })
          done();
        })
        .catch(lib.helpers.errorHandler.bind(this));
    });
})