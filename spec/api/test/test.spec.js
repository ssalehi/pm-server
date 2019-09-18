const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const moment = require('moment');

describe('POST Order - ORP', () => {

  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll()
      done();
    } catch (err) {
      console.log(err);
    };
  }, 15000);

  it('test', async function (done) {
    try {
      this.done = done;

      let currentDay = moment().format('YYYY-MM-DD')
      await models()['DeliveryTest'].create({
        order_id: mongoose.Types.ObjectId(),
        order_line_ids: [mongoose.Types.ObjectId()],
        start: currentDay
      });

      let delivery = await models()['DeliveryTest'].findOne({});

      let strStart = moment(delivery.start, 'YYYY-MM-DD').format('YYYY-MM-DD');
      
      expect(strStart).toBe(currentDay)



      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err)
    };
  });




});