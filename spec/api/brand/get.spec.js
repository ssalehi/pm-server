const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
describe("Get Brand", () => {

  let brandIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let brands = [
          {name : 'brand 1'},
          {name : 'brand 2'},
          {name : 'brand 3'},
          {name : 'brand 4'},
          {name : 'brand 5'},
        ];

        return models()['BrandTest'].insertMany(brands);

      })
      .then(res => {

        brandIds = res.map(p => p._id.toString());
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get list of all brands", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`brand`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(brandIds.length);

      result.forEach(r => {
        expect(brandIds.includes(r._id.toString())).toBeTruthy();
      });
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
