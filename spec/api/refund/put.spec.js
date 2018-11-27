const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Put Refund basics", () => {

  let customerObj = {
    cid: null,
    jar: null,
  };
  let balance = 10000;

  beforeEach(async done => {

    try {
      await lib.dbHelpers.dropAll();

      let res = await lib.dbHelpers.addAndLoginCustomer('s', '123456', {
        first_name: 'saman',
        surname: 'vaziri',
        balance: balance
      });

      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;

      done();
    } catch (err) {
      console.log(err);
    }
  }, 15000);

  it("should be an error when each one of parameters is missed",  async function (done) {

    try {
      this.done = done;
      await rp({
        method: 'put',
        uri: lib.helpers.apiTestURL(`refund`),
        body: {
          // requested_time: '',
          // card_no: '',
          owner_card_name: 'saman',
          owner_card_surname: 'vaziri'
        },
        jar: customerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail('parameters not found');
        done();

    }
    catch (err) {
      expect(err.statusCode).toBe(500);
      expect(err.error).toBe('data incomplete');
      done();
    }
  });

  it("should set refund form in database",  async function (done) {

    try {
      this.done = done;
      let res = await rp({
        method: 'put',
        uri: lib.helpers.apiTestURL(`refund`),
        body: {
          requested_time: new Date(),
          card_no: '12345678910',
          owner_card_name: 's',
          owner_card_surname: 'v'
        },
        jar: customerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let RefundForm = await models()['RefundTest'].findOne();

      expect(RefundForm.card_no).toBe(res.body.card_no);
      expect(RefundForm.owner_card_name).toBe(res.body.owner_card_name);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });
});


