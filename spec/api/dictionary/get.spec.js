const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
describe("Dictionary GET", () => {

  let dictionaryIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {

      let dictionaries = [{
          name: 'name 1',
          value: 'value 1',
          type: 'type 1'
        },
        {
          name: 'name 2',
          value: 'value 2',
          type: 'type 2'
        },
        {
          name: 'name 3',
          value: 'value 3',
          type: 'type 3'
        },
      ];

      return models['DictionaryTest'].insertMany(dictionaries);

    }).then(res => {

      dictionaryIds = res.map(p => p._id.toString());
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });


  it("should get list of all dictionaries", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`dictionary`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(dictionaryIds.length);
      result.forEach(r => {
        expect(dictionaryIds.includes(r._id.toString())).toBeTruthy();
      });
      done();

    }).catch(lib.helpers.errorHandler.bind(this));
  });

});
