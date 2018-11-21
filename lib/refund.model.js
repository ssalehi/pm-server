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

  async setRefundFrom(user, body) {
    try {
      if (!user) return error.noUser;
      const query = {
        status: consts.REFUND_FORM_STATUS.Pending,
        customer_id: user._id,
        requested_time: new Date(),
        owner_card_name: body.owner_card_name,
        bank_name: body.bank_name,
        owner_card_surname: body.owner_card_surname
      };

      if (body.hasOwnProperty('card_no')) {
        query['card_no'] = body.card_no;
      }

      if (body.hasOwnProperty('sheba_no')) {
        query['sheba_no'] = body.sheba_no;
      }



      if (user.access_level === consts.ACCESS_LEVEL.SalesManager) {
        //  await this.RefundModel.update({
        //   'customer_id': mongoose.Types.ObjectId(user._id),
        //   status: consts.REFUND_FORM_STATUS.Pending,
        // }, {
        //
        //  });
      } else {
        return this.RefundModel.create(query);
      }
    } catch (err) {
      throw err;
    }
  }

  async getAllRefundForms () {
      try {

        let refundFormDetails = await this.RefundModel.aggregate([
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
          },
          {
            $project: {
              _id: 1,
              customer_first_name: '$customer.first_name',
              customer_surname: '$customer.surname',
              customer_balance: '$customer.balance',
              mobile_number: '$customer.mobile_no',
              owner_card_name: 1,
              owner_card_surname: 1,
              bank_name: 1,
              card_no: 1,
              sheba_no: 1,
              requested_time: 1,
              status: 1,
            }
          }
        ]);
        return refundFormDetails;

      }
      catch (err) {
        throw err;
      }
  }

  async getDetailRefundForm(body) {
    console.log('body', body);
    if (!body.refund_form_id) {
      return Promise.reject(error.noUser)
    }
    try {

      let refundFormDetails = await this.RefundModel.aggregate([
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
        },
        {
          $group: {
            _id: '$_id',
            customer: {
              $push: {
                _id: '$customer._id',
                first_name: '$customer.first_name',
                surname: '$customer.surname',
                balance: '$customer.balance',
                mobile_no: '$customer.mobile_no',
                gender: '$customer.gender',
              }
            },
            status: {$first: '$status'},
            requested_time: {$first: '$requested_time'},
            executed_time: {$first: '$executed_time'},
            owner_card_name: {$first: '$owner_card_name'},
            owner_card_surname: {$first: '$owner_card_surname'},
            card_no: {$first: '$card_no'},
            sheba_no: {$first: '$sheba_no'},
            comment: {$first: '$comment'},
          }
        }
      ]);
      console.log('refundform:::', refundFormDetails);
      return refundFormDetails[0];

    }
    catch (err) {
      throw err;
    }
  }
}

Refund.test = false;
module.exports = Refund;
// const queryUpdate = {
//   status: consts.REFUND_FORM_STATUS.Pending,
//   customer_id: user._id,
//   requested_time: new Date(),
//   owner_card_name: body.owner_card_name,
//   owner_card_surname: body.owner_card_surname,
//   card_no: body.card_no,
//   sheba_no: body.sheba_no
// };


// return this.RefundModel.create(queryUpdate)
// return this.RefundModel.findOneAndUpdate(
//    {
//      'customer_id': mongoose.Types.ObjectId(user._id),
//       status: consts.REFUND_FORM_STATUS.Pending,
//    },
//    {
//      ...queryUpdate
//    },
//    {
//      upsert: true,
//    })
