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
    let condition = {};

    if (user.access_level === _const.ACCESS_LEVEL.SalesManager) {
      condition = {$and: [{'from.warehouse_id': {$exists: false}}, {'from.customer': {$exists: true}}]};
    } else if (mongoose.Types.ObjectId.isValid(user.warehouse_id)) {
      condition = {$and: [{'from.warehouse_id': mongoose.Types.ObjectId(user.warehouse_id)}, {'from.customer_id': {$exists: false}}]};
    } else {
      return Promise.reject(errors.noAccess);
    }

    return this.DeliveryModel.aggregate([
      {
        $match: condition
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
          path: '$order',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order.order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {'id_cmp': {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}}
      },
      {
        $match: {
          id_cmp: 0,
        }
      },
      {
        $addFields: {'last_ticket': {"$arrayElemAt": ["$order.order_lines.tickets", -1]}}
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'from_customer.addresses',
          localField: 'from.customer.address_id',
          foreignField: '_id',
          as: 'from_customer_address',
        }
      },
      {
        $lookup: {
          from: 'warehouse',
          localField: 'from.warehouse_id',
          foreignField: '_id',
          as: 'from_warehouse'
        }
      },
      {
        $unwind: {
          path: '$from_warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'to_customer.addresses',
          localField: 'to_customer.customer.address_id',
          foreignField: '_id',
          as: 'to_customer_address',
        }
      },
      {
        $lookup: {
          from: 'warehouse',
          localField: 'to.warehouse_id',
          foreignField: '_id',
          as: 'to_warehouse'
        }
      },
      {
        $unwind: {
          path: '$to_warehouse',
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
        $lookup: {
          from: 'warehouse',
          localField: 'return.warehouse_id',
          foreignField: '_id',
          as: 'return_address'
        }
      },
      {
        $group: {
          _id: '$_id',
          delivery_agent: {
            $first: {
              firstname: '$sender_agent.firs_tname',
              surname: '$sender_agent.surname',
              username: '$sender_agent.username',
              _id: '$sender_agent._id',
            }
          },
          from: {
            $first: {
              customer: {
                address: '$from_customer_address',
                _id: '$from_customer._id'
              },
              warehouse: '$from_warehouse'
            }
          },
          to: {
            $first: {
              customer: {
                first_name: '$to_customer.first_name',
                surname: '$to_customer.surname',
                username: '$to_customer.username',
                address: '$to_customer_address',
                _id: '$to_customer._id'
              },
              warehose: '$to_warehouse'
            }
          },
          shelf_code: {$first: '$order.shelf_code'},
          return: {$first: '$return_address'},
          created_at: {$first: '$created_at'},
          start_date: {$first: '$start_date'},
          end_date: {$first: '$end_date'},
          slot: {$first: '$last_ticket.desc'},
          order_details: {$first: '$order_details'},
        }
      }
    ]);
  }
}

Delivery.test = false;
module.exports = Delivery;