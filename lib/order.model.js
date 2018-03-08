const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');

class Order extends Base {

  constructor(test = Order.test) {

    super('Order', test);

    this.OrderModel = this.model;
  }

  addToOrder(body) {
    let cid = body.customer_id;
    let piid = body.product_instance_id;

    if (!mongoose.Types.ObjectId.isValid(cid) || !mongoose.Types.ObjectId.isValid(piid))
      return Promise.reject(error.invalidId);

    return models['OrderLine' + (Order.test ? 'Test' : '')].create({
      product_instance_id: piid
    })
      .then(res => {
        console.log("orderLine res: ", res);
      });

    return this.OrderModel.update({
      "_id": cid,
    }, {
      $push: {
        'order_line_ids': piid //should be 'orderline_id' given from above
      }
    }, {
      upsert: true
    });
  }

}

Order.test = false;

module.exports = Order;