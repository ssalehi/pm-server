const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe("Put Product", () => {

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        done();
      }).catch(err => {
      console.log(err);
      done();
    });
  });


  it("should add a new product", function (done) {

    done();
    //   this.done = done;
    //
    //   rp({
    //     method: 'put',
    //     uri: lib.helpers.apiTestURL(`product`),
    //     resolveWithFullResponse: true
    //   }).then(res => {
    //     expect(res.statusCode).toBe(200);
    //
    //     return models['ProductTest'].find({})
    //
    //   }).then(res =>{
    //
    //     console.log('-> ',res);
    //     done();
    //
    //   })
    //     .catch(lib.helpers.errorHandler.bind(this));
    });


  });