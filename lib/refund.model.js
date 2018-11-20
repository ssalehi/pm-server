const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const CustomerModel = require('./customer.model');

class Refund extends Base {

  constructor(test = Refund.test) {

    super('Refund', test);

    this.RefundModel = this.model;
  }

  setRefundFrom(user, body) {

    if (!user)
      return Promise.reject(error.noUser);
    if (!['requested_time', 'card_no', 'owner_card_surname', 'owner_card_name'].every(x => body[x])) {
      return Promise.reject('data incomplete');
    }

    this.RefundModel.findOneAndUpdate({}, {}, {upsert: true});


  }


//     return models()['Customer' + (Refund.test ? 'Test' : '')].findOneAndUpdate({
//       _id: mongoose.Types.ObjectId(user.customer_id),
//       is_guest: false,
//     },
//       {
//
//   }
//
// )
//
//
//   }

}


Refund.test = false;
module.exports = Refund;
