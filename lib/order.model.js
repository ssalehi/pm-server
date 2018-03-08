const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Order extends Base {
  constructor(test = Order.test) {
    super('Order', test);
    this.OrderModel = this.model;
  }

  getCartItems(user, body) {
    if (!user && (!body || !body.data))
      return Promise.reject(error.instanceDataRequired);

    return new Promise((resolve, reject) => {
      // Check user is logged in or not
      // If user is logged in get instance_ids of order-line
      if(user) {
        this.OrderModel.aggregate([
          {
            $match: {address_id: {$exists: false}, is_cart: true}
          },
          {
            $unwind: {
              path: '$order_line_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'campaign',
              localField: 'order_line_ids.campaign_id',
              foreignField: '_id',
              as: 'campaign'
            }
          },
          {
            $unwind: {
              path: '$order_line_ids.campaign.collection_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              _id: '$order_line_ids.product_instance_id',
              quantity: {$sum: 1},
              campaign_id: {$first: '$campaign._id'},
              collection_id: {$first: '$campaign.collection_ids._id'},
            }
          },
        ]);
      }
    });
  }
}

Order.test = false;
module.exports = Order;