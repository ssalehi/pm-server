const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');

describe("Get Refund forms", () => {
  let customer1,  customer2;
  let form1, form2;
  let warehouse;
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
        "shoesType" : "US",
        "is_guest" : false,
        "is_preferences_set" : false,
        "preferred_brands" : [],
        "preferred_tags" : [],
        "orders" : [],
        "active" : true,
        "username" : "s",
        "first_name" : "saman",
        "surname" : "vaziri",
        "mobile_no": "0912345678"

      });

      customer2 = await  models()['CustomerTest'].create({
        "loyalty_points" : 0,
        "balance" : 2222,
        "is_verified" : 3,
        "shoesType" : "US",
        "is_guest" : false,
        "is_preferences_set" : false,
        "preferred_brands" : [],
        "preferred_tags" : [],
        "orders" : [],
        "active" : true,
        "username" : "sam",
        "first_name" : "bbbbb",
        "surname" : "aaa",
        "mobile_no": "09124567890"

      });

      form1 = {
        owner_card_name: 'sa',
        owner_card_surname: 'va',
        card_no: '123',
        requested_time: new Date(),
        status: _const.REFUND_FORM_STATUS.Pending,
        customer_id:  customer1._id
      };

       form2 = {
        owner_card_name: 'ma',
        owner_card_surname: 'na',
        sheba_no: '456',
        requested_time: new Date(),
        status: _const.REFUND_FORM_STATUS.Pending,
        customer_id: customer2._id
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


  it("should be able to get all refund form by sales manager",  async function (done) {

    try {
      this.done = done;
      let res = await rp({
        method: 'get',
        uri: lib.helpers.apiTestURL(`get_refund_form`),
        body: {refund_form_id: RefundForms[0]._id},
        jar: SalesManagerObj.rpJar,
        json: true,
        resolveWithFullResponse: true
      });
      expect(res.statusCode).toBe(200);
      console.log('res:::',res.body);
      done();
    }
    catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    }
  });
});