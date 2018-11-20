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


  it("should error when user not found",  async function (done) {

    try {
      this.done = done;
      let res = await rp({
        method: 'put',
        uri: lib.helpers.apiTestURL(`refund`),
        body: {},
        // jar: customerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      this.fail("should error when user not found");
      done();
    }
    catch (err) {
      expect(err.statusCode).toBe(error.noUser.status);
      expect(err.error).toBe(error.noUser.message);
      done();
    }
  });


  it("should be an error when each one of parameters is missed",  async function (done) {

    try {

      this.done = done;
      let res = await rp({
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
      this.fail('aaaaaaaa')
        done();

    }
    catch (err) {
      expect(err.statusCode).toBe(500);
      expect(err.error).toBe('data incomplete');
      done();
    }
  });
});

// let refundForm = await models()['RefundTest'].find({}).lean();
//
// expect(refundForm.owner_card_name.length).toBe(1);