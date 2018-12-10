const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');

describe("Get Refund forms", () => {
  let customer1,  customer2;
  let form1, form2;
  let SalesManagerObj;
  let RefundForms;

  let customerObj = {
    cid: null,
    jar: null,
  };

  beforeEach(async done => {

    try {
      await lib.dbHelpers.dropAll();
      const warehouse = await models()['WarehouseTest'].create({
        name: 'انبار مرکزی',
        phone: 'نا مشخص',
        address: {
          city: 'تهران',
          street: 'نامشخص',
          province: 'تهران'
        },
        priority: 0,
      });

      let sm = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouse._id);
      SalesManagerObj = sm;

      const res = await lib.dbHelpers.addAndLoginCustomer('s', '123456', {
        first_name: 'saman',
        surname: 'vaziri',
        balance: 2000
      });

      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;


       customer1 = await models()['CustomerTest'].create({
        "loyalty_points" : 0,
        "balance" : 10000,
        "is_verified" : 3,
        "shoesType" : "EU",
        "is_guest" : false,
        "is_preferences_set" : false,
        "preferred_brands" : [],
        "preferred_tags" : [],
        "orders" : [],
        "active" : true,
        "username" : "f",
        "first_name" : "saman",
        "surname" : "vaziri",
        "mobile_no": "0912345678"

      });

      customer2 = await  models()['CustomerTest'].create({
        "loyalty_points" : 0,
        "balance" : 22222,
        "is_verified" : 3,
        "shoesType" : "US",
        "is_guest" : false,
        "is_preferences_set" : false,
        "preferred_brands" : [],
        "preferred_tags" : [],
        "orders" : [],
        "active" : true,
        "username" : "ali",
        "first_name" : "ali",
        "surname" : "sav",
        "mobile_no": "09124567890"

      });

      form1 = {
        owner_card_name: 'sa',
        owner_card_surname: 'va',
        card_no: '123',
        requested_time: new Date(),
        status: _const.REFUND_FORM_STATUS.Pending,
        customer_id:  customer1._id,
        amount: 10000
      };

       form2 = {
        owner_card_name: 'ma',
        owner_card_surname: 'na',
        sheba_no: '456',
        requested_time: new Date(),
        status: _const.REFUND_FORM_STATUS.Pending,
        customer_id: customerObj.cid,
         amount: 22222,
         active: false
       };

       RefundForms = await models()['RefundTest'].insertMany([
        form1,
        form2
      ]);



      done();
    } catch (err) {
      console.log(err);
    }
  }, 15000);

  it("should be get balance and status by customer id",  async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`/refund/get_balance`),
        jar: customerObj.jar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let customer = await models()['CustomerTest'].findOne({_id: customerObj.cid}).lean();
      expect(customer.balance).toBe(2000);

      let Refund = await models()['RefundTest'].findOne({customer_id: customerObj.cid}).lean();
      expect(Refund.active).toBe(false);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });


  it("should be able to get refund form details by sales manager",  async function (done) {
    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`/refund/get_forms/0/10`),
        body: {_id: RefundForms[1]._id},
        jar: SalesManagerObj.rpJar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let Refund = await models()['RefundTest'].findOne({_id: RefundForms[1]._id}).lean();
      expect(Refund.sheba_no).toBe('456');
      expect(Refund.amount).toBe(22222);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });
});