const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');

describe('GET Customer', () => {

  let adminObj = {
    aid: null,
    jar: null,
  };
  let customerIds = [];
  let customerArr = [{
    first_name: 'a',
    surname: 'b',
    username: 'un1',
    is_verified: true,
    balance: 20,
    loyalty_points: 10,
  }, {
    first_name: 'c',
    surname: 'd',
    username: 'un2',
    is_verified: true,
    balance: 100,
    loyalty_points: 0,
  }];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['CustomerTest'].insertMany(customerArr);
      })
      .then(res => {
        customerIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('should get balance and loyalty points of person a', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`customer/${customerIds[0]}/balance`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.loyalty_points).toBe(customerArr[0].loyalty_points);
      expect(res.body.balance).toBe(customerArr[0].balance);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});