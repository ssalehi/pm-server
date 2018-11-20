const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const consts = require('../lib/const.list');

class Refund extends Base {

  constructor(test = Refund.test) {

    super('Refund', test);

    this.RefundModel = this.model;
  }

  setRefundFrom(user, body) {
    console.log('user:::', user);
    console.log('body:::', body);
    if (!user)
      return Promise.reject(error.noUser);

    if (!body.card_no && !body.owner_card_surname && (!body.owner_card_name || !body.sheba_no)) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    const queryUpdate = {
      status: consts.REFUND_FORM_STATUS.Pending,
      customer_id: user._id,
      requested_time: new Date(),
      owner_card_name: body.owner_card_name,
      owner_card_surname: body.owner_card_surname,
      card_no: body.card_no,
      sheba_no: body.sheba_no
    };

    if (body.owner_card_name) {
      let refundForm = new this.RefundModel(queryUpdate);
      return refundForm.save();
    }
    else return this.RefundModel.findOneAndUpdate(
      {
        'customer_id': mongoose.Types.ObjectId(user._id)
      },
      {
        ...queryUpdate
      },
      {
        new: true
      })

  }

  async getDetailRefundForm(body) {
    console.log(body.refund_form_id);
    try {

      return this.RefundModel.aggregate([
        {
          $match: {_id: mongoose.Types.ObjectId(body.refund_form_id)}
        },

        {
          $lookup: {
            from: 'customer',
            localField: 'customer_id',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: {
            path: '$customer',
            preserveNullAndEmptyArrays: true
          }
        }
        // {
        //   $group: {
        //     _id: '$_id',
        //     customer: {
        //       $push: {
        //         _id: '$customer._id',
        //         first_name: '$customer.first_name',
        //         surname: '$customer.surname',
        //         balance: '$customer.balance',
        //         mobile_no: '$customer.mobile_no',
        //         gender:'$customer.gender',
        //       }
        //     },
        //     status: {$first: '$status'},
        //     requested_time: {$first: '$requested_time'},
        //     executed_time: {$first: '$executed_time'},
        //     owner_card_name: {$first: '$owner_card_name'},
        //     owner_card_surname: {$first: '$owner_card_surname'},
        //     card_no: {$first: '$card_no'},
        //     sheba_no: {$first: '$sheba_no'},
        //     comment: {$first: '$comment'},
        //   }
        // }
      ]);
    }
    catch (err) {
      throw err;
    }
  }

}

Refund.test = false;
module.exports = Refund;
// $set: {
//   // 'status': body.status,
//   queryUpdate,
//     // 'requested_time': new Date(),
//     'executed_time': new Date(),
//     // 'card_no': body.card_no,
//     // 'sheba_no': body.sheba_no,
//     'tracking_no': body.tracking_no,
//     'comment': body.comment,
//   // 'owner_card_name': body.owner_card_name,
//   // 'owner_card_surname': body.owner_card_surname
// },

