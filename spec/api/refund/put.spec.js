const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');


describe("Put Refund basics", () => {

  let customerObj = {
    cid: null,
    jar: null,
  };


  beforeEach(async done => {

    try {
      await lib.dbHelpers.dropAll();

      const res = await lib.dbHelpers.addAndLoginCustomer('s', '123456', {
        first_name: 'saman',
        surname: 'vaziri',
        balance: 10000
      });


      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;

      done();
    } catch (err) {
      console.log(err);
    }
  }, 15000);


  it("should set refund form in database", async function (done) {

    try {
      this.done = done;
      let res = await rp({
        method: 'put',
        uri: lib.helpers.apiTestURL(`refund`),
        body: {
          requested_time: new Date(),
          card_no: '123',
          owner_card_name: 'sa',
          owner_card_surname: 'va'
        },
        jar: customerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let RefundForm = await models()['RefundTest'].findOne();
      expect(RefundForm.card_no).toBe(res.body[0].card_no);
      expect(RefundForm.owner_card_name).toBe(res.body[0].owner_card_name);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

  it("should set balance to zero automatically after customer send refund form", async function (done) {
    try {
      this.done = done;

      let res = await rp({
        method: 'put',
        uri: lib.helpers.apiTestURL(`refund`),
        body: {
          owner_card_name: 'ali',
          owner_card_surname: 'amiri',
          bank_name: 'Melli',
          card_no: 987654321,
          requested_time: new Date(),
        },
        jar: customerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let Refund = await models()['RefundTest'].findOne({customer_id: customerObj.cid}).lean();

      let customer = await models()['CustomerTest'].findOne({_id: customerObj.cid}).lean();
      expect(customer.balance).toBe(0);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

});


