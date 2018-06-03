const Base = require('./base.model');
const _const = require('./const.list');
const mongoose = require('mongoose');
const errors = require('./errors.list');

class Delivery extends Base {

  constructor(test = Delivery.test) {
    super('Delivery', test);
    this.DeliveryModel = this.model;
  }

  getDeliveryItems(user, body) {
    if (user.access_level === _const.ACCESS_LEVEL.SalesManager) {
      return this.DeliveryModel.aggregate([
        {
          $match: {
            $and: [{'from.warehouse_id': {$exists: false}}, {'from.customer': {$exists: true}}],
          }
        },
        {
          $unwind: {
            path: '$order_details',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$order_details.order_line_ids',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'order',
            localField: 'order_details.order_id',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $unwind: {
            path: '$order.order_lines',
            preserveNullAndEmptyArrays: true            
          }
        },
        {
          $match: {
            'order.order_lines._id': '$order_details.order_line_ids',
          }
        },
        {
          $addFields: {'last_ticket': { "$arrayElemAt": [ "$order.order_lines.tickets", -1 ] }}
        },
        {
          $lookup: {
            from: 'customer',
            localField: 'from.customer._id',
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
          $lookup: {
            from: 'agent',
            localField: 'sender',
            foreignField: '_id',
            as: 'sender_agent',
          }
        },
        {
          $unwind: {
            path: '$sender_agent',
            preserveNullAndEmptyArrays: true            
          }
        },
        {
          $group: {
            _id: '$_id',
            delivery_agent: {
              firstname: {$first: '$sender_agent.firstname'},
              surname: {$first: '$sender_agent.surname'},
              username: {$first: '$sender_agent.username'},
              _id: {$first: '$sender_agent._id'},
            },
            customer: {
              firstname: {$first: '$customer.firstname'},
              surname: {$first: '$customer.surname'},
              username: {$first: '$customer.username'},
              _id: {$first: '$customer._id'},
            },
            from: {$first: '$from'},
            to: {$first: '$to'},
            return: {$first: '$return'},
            created_at: {$first: '$created_at'},
            start_date: {$first: '$start_date'},
            end_date: {$first: '$end_date'},
            slot: {$first: '$last_ticket.timestamp'},
            order_details: {$first: '$order_details'},
          }
        }
      ]);
    } else if (mongoose.Types.ObjectId.isValid(user.warehouse_id)) {
      return this.DeliveryModel.find({
        $and: [{'from.warehouse_id': mongoose.Types.ObjectId(user.warehouse_id)}, {'from.customer_id': {$exists: false}}]
      });
    } else {
      return Promise.reject(errors.noAccess);
    }
  }
}

Delivery.test = false;
module.exports = Delivery;