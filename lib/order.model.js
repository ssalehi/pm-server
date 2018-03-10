const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');

class Order extends Base {

  constructor(test = Order.test) {
    super('Order', test);
    this.OrderModel = this.model;
  }

  /**
   * @param body
   *  customer_id : the id of the customer
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to add
   * @returns {Promise.<*>}
   */
  addToOrder(body) {
    let cid = body.customer_id;
    let piid = body.product_instance_id;
    let n = body.number || 1;

    if (!mongoose.Types.ObjectId.isValid(cid) || !mongoose.Types.ObjectId.isValid(piid))
      return Promise.reject(error.invalidId);

    // TODO: should check if we have more than 'n' number of product instance in our inventory

    return models['Customer' + (Order.test ? 'Test' : '')]
      .findOne({_id: cid})
      .then(res => {
        if (!res)
          return Promise.reject(error.customerIdNotValid);

        let newOrderLines = [];
        for (let i = 0; i < n; i++) {
          newOrderLines.push({
            product_instance_id: piid
          });
        }

        return this.OrderModel.update({
          customer_id: cid,
          //and also another field like: 'is_basket: true'
          is_cart: true,
        }, {
          $addToSet: {
            'order_line_ids': {
              $each: newOrderLines
            }
          }
        }, {
          upsert: true
        })
      });
  }


  /**
   * @param body
   *  customer_id : the id of the customer
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to remove
   * @returns {Promise.<*>}
   */
  removeFromOrder(body) {
    let cid = body.customer_id;
    let piid = body.product_instance_id;
    let n = body.number || -1;

    if (!mongoose.Types.ObjectId.isValid(cid) || !mongoose.Types.ObjectId.isValid(piid))
      return Promise.reject(error.invalidId);


    return models['Customer' + (Order.test ? 'Test' : '')]
      .findOne({_id: cid})
      .then(res => {
        if (!res)
          return Promise.reject(error.customerIdNotValid);

        if (n === -1 || n === null) {
          return this.OrderModel.update({
            customer_id: cid, is_cart: true
          }, {
            $pull: {
              'order_line_ids': {
                product_instance_id: piid
              }
            }
          }, {
            multi: true
          });
        }
        else {

          return this.OrderModel.aggregate([
            {
              $match: {customer_id: mongoose.Types.ObjectId(cid), is_cart: true}
            },
            {
              $unwind: {
                path: "$order_line_ids",
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {"order_line_ids.product_instance_id": mongoose.Types.ObjectId(piid)}
            },
            {
              $limit: n
            }
          ])
            .then(res => {
              let ids = res.map(x => x.order_line_ids._id);
              return this.OrderModel.update({
                customer_id: cid,
              }, {
                $pull: {
                  'order_line_ids': {
                    _id: {$in: ids}
                  }
                }
              })
            });
        }
      });
  }

}

Order.test = false;

module.exports = Order;