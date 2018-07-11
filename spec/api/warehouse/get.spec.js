const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');

describe("Get Warehouse", () => {

  let warehouseIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

       
        return models()['WarehouseTest'].insertMany(warehouses);

      })
      .then(res => {

        warehouseIds = res.map(p => p._id.toString());
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get list of all warehouses", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`warehouse/all`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);

      expect(result.length).toBe(warehouseIds.length);

      result.forEach(r => {
        expect(warehouseIds.includes(r._id.toString())).toBeTruthy();

      });
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


  it("should return only list of customer front stores", function(done) {
    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`warehouse`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(3);
      result.forEach(r => {
        expect(warehouseIds.includes(r._id.toString())).toBeTruthy();
        expect(+r.name.split(' ')[1] > 2);
      });
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  })

});
