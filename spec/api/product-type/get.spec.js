const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
describe("Get Product Type", () => {

  let productTypeIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let types = [
          {name : 'type 1'},
          {name : 'type 2'},
          {name : 'type 3'},
          {name : 'type 4'},
          {name : 'type 5'},
        ];

        return models['ProductTypeTest'].insertMany(types);

      })
      .then(res => {

        productTypeIds = res.map(p => p._id.toString());
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get list of all product types", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`productType`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(productTypeIds.length);
      result.forEach(r => {
        expect(productTypeIds.includes(r._id.toString())).toBeTruthy();
      });
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
