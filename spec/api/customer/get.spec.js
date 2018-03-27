const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');

describe('GET Customer', () => {

  let customerObj = {
    cid: null,
    jar: null,
  };

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('cust', 'pass', {
        first_name: 'c',
        surname: 'v',
        balance: 20,
        loyalty_points: 10,
      }))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

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
      uri: lib.helpers.apiTestURL(`customer/balance`),
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.balance).toBe(20);
      expect(res.body.loyalty_points).toBe(10);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});