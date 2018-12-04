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

  async getBalanceAndStatus(user) {
    try {
      if (!user._id) return error.noUser;

      let customerModel = await models()['Customer' + (Refund.test ? 'Test' : '')].findOne({
        _id: mongoose.Types.ObjectId(user._id),
      }, 'balance');

      let refundModel = await this.RefundModel.findOne({
        customer_id: mongoose.Types.ObjectId(user._id), 'active': true});

      return Promise.resolve([customerModel, refundModel])
    }
    catch (err) {
      throw err;
    }
  }


  async setRefundFrom(user, body) {

    try {
      if (!user) return error.noUser;
      if (!body) return error.dataIsNotCompleted
      const query = {
        status: consts.REFUND_FORM_STATUS.Pending,
        customer_id: user._id,
        amount: user.balance,
        requested_time: new Date(),
        owner_card_name: body.owner_card_name,
        owner_card_surname: body.owner_card_surname,
        bank_name: body.bank_name,
        active: true
      };

      if (body.hasOwnProperty('card_no')) {
        query['card_no'] = body.card_no;
      }

      if (body.hasOwnProperty('sheba_no')) {
        query['sheba_no'] = body.sheba_no;
      }


      let refundModel = await this.RefundModel.create(query);
      let customerModel = await models()['Customer' + (Refund.test ? 'Test' : '')].update(
        {
          _id: refundModel.customer_id,
        }, {
          $set: {balance: 0}
        },
        {
          new: true
        });

      return Promise.resolve([refundModel, customerModel])

    } catch (err) {
      throw err;
    }
  }

  async getAllRefundForms(offset, limit) {

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
            customer_id: '$customer._id',
            customer_first_name: '$customer.first_name',
            customer_surname: '$customer.surname',
            amount: 1,
            mobile_number: '$customer.mobile_no',
            owner_card_name: 1,
            owner_card_surname: 1,
            bank_name: 1,
            card_no: 1,
            sheba_no: 1,
            requested_time: 1,
            status: 1,
            comment: 1
          }
        },
        {
          $sort: {requested_time: -1}
        },
        {
          $group: {
            '_id': null,
            result: {$push: '$$ROOT'},
            total: {$sum: 1}
          }
        },
        {
          $project: {
            total: 1,
            result: {
              $slice: ['$result', Number.parseInt(offset), Number.parseInt(limit)]
            }
          }
        }
      ]);

      let res = await refundFormDetails.length ? refundFormDetails[0] : {total: 0, result: []};
      return res;
    }
    catch (err) {
      throw err;
    }
  }

  async setDetailRefundForm(body) {
    try {
      if (!body._id) return error.dataIsNotCompleted;
      const query = {
        status: body.status,
        owner_card_name: body.owner_card_name,
        owner_card_surname: body.owner_card_surname,
        bank_name: body.bank_name,
        comment: body.comment,
        executed_time: new Date(),
        amount: 0,
        active: false
      };

      if (body.hasOwnProperty('card_no')) {
        query['card_no'] = body.card_no;
      }

      if (body.hasOwnProperty('sheba_no')) {
        query['sheba_no'] = body.sheba_no;
      }
      let refundModel = await this.RefundModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(body._id),
      }, {
        $set: query
      }, {
        new: true,
      });

      return Promise.resolve(refundModel)
    }
    catch (err) {
      throw err;
    }
  }

  async rejectDetailRefundForm(body) {
    try {
      if (!body._id) return error.dataIsNotCompleted;
      console.log('amount:::', body.amount);
      console.log('body', body);
      const query = {
        status: body.status,
        comment: body.comment,
        executed_time: body.executed_time,
        customer_id: body.customer_id,
        amount: body.amount,
        active: false
      };

      let refundModel = await this.RefundModel.update({
        _id: mongoose.Types.ObjectId(body._id),
      }, {
        $set: query
      });

      let customerModel = await models()['Customer' + (Refund.test ? 'Test' : '')].update(
        {
          _id: body.customer_id,
        }, {
          $set: {balance: body.amount}
        });
      return Promise.resolve([refundModel, customerModel])
    }
    catch (err) {
      throw err;
    }
  }
}

Refund.test = false;
module.exports = Refund;