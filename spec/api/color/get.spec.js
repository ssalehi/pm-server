const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
describe("Get Color", () => {

  let colorIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let colors = [
          {name : 'color 1'},
          {name : 'color 2'},
          {name : 'color 3'},
          {name : 'color 4'},
          {name : 'color 5'},
        ];

        return models['ColorTest'].insertMany(colors);

      })
      .then(res => {

        colorIds = res.map(p => p._id);
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
      uri: lib.helpers.apiTestURL(`color`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(colorIds.length);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
