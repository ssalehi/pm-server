const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
describe("Get Warehouse", () => {

  let warehouseIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let warehouses = [
          {name: 'warehouse 1', address: 'some address 1', phone: 'some phone 1'},
          {name: 'warehouse 2', address: 'some address 2', phone: 'some phone 2'},
          {name: 'warehouse 3', address: 'some address 3', phone: 'some phone 3'},
          {name: 'warehouse 4', address: 'some address 4', phone: 'some phone 4'},
          {name: 'warehouse 5', address: 'some address 5', phone: 'some phone 5'},
        ];

        return models['WarehouseTest'].insertMany(warehouses);

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
      uri: lib.helpers.apiTestURL(`warehouse`),
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

});
