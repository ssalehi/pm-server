const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');

describe("POST Refund forms", () => {
  let customer1,  customer2;
  let form1, form2;
  let SalesManagerObj;
  let RefundForms;

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


      customer1 = await models()['CustomerTest'].create({
        "loyalty_points" : 0,
        "balance" : 10000,
        "is_verified" : 3,
        "shoesType" : "EU",
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
        "balance" : 0,
        "is_verified" : 3,
        "shoesType" : "US",
        "is_preferences_set" : false,
        "preferred_brands" : [],
        "preferred_tags" : [],
        "orders" : [],
        "active" : true,
        "username" : "ali",
        "first_name" : "alavi",
        "surname" : "av",
        "mobile_no": "09124567890"

      });

      form1 = {
        owner_card_name: 'sa',
        owner_card_surname: 'va',
        card_no: '123',
        requested_time: new Date(),
        status: _const.REFUND_FORM_STATUS.Pending,
        customer_id:  customer1._id,
        bank_name: 'Tejarat',
        comment: 'comment',
        executed_time: new Date()
      };

      form2 = {
        owner_card_name: 'ma',
        owner_card_surname: 'na',
        sheba_no: '456',
        requested_time: new Date(),
        status: _const.REFUND_FORM_STATUS.Refused,
        customer_id: customer2._id,
        bank_name: 'Saderat',
        comment: 'some comment',
        executed_time: new Date(),
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


  it("should be able to update refund form details by sales manager",  async function (done) {
    try {
      this.done = done;

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`/refund/set_detail_form`),
        body: {
            _id: RefundForms[0]._id,
            owner_card_name: 'va',
            owner_card_surname: 'sa',
            bank_name: 'Melli',
            card_no: 987654321,
            comment: 'adding tracking number',
            status: 2
        },
        jar: SalesManagerObj.rpJar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let Refund = await models()['RefundTest'].find({_id: RefundForms[0]._id}).lean();

      expect(Refund[0].status).toBe(2);
      expect(Refund[0].card_no).toBe('987654321');
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

  it("should change status and balance when form rejected by sales manager",  async function (done) {
    try {
      this.done = done;

      let res = await rp({
        method: 'post',
        uri: lib.helpers.apiTestURL(`/refund/reject_detail_form`),
        body: {
          _id: RefundForms[1]._id,
          status: 3,
          comment: 'Form Rejected',
          executed_time: new Date(),
          customer_id: RefundForms[1].customer_id,
          amount: 444,
        },
        jar: SalesManagerObj.rpJar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      let Refund = await models()['RefundTest'].findOne({_id: RefundForms[1]._id}).lean();
      expect(Refund.status).toBe(3);

      let customer = await models()['CustomerTest'].findOne({_id: Refund.customer_id}).lean();
      expect(customer.balance).toBe(444);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });

});
