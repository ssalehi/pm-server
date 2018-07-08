const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');
const Ticket = require('./ticket.model');
const models = require('../mongo/models.mongo')

class TicketAction extends Ticket {

  constructor(test) {
    super(test);
    this.test = test;
  }

  newScan(barcode, user) {

    if (!barcode)
      return Promise.reject(error.barcodeNotFound);
    const OrderModel = require('./order.model');
    let foundProduct;
    return new ProductModel(this.test).getInstanceByBarcode(barcode)
      .then(res => {
        foundProduct = res
        return new OrderModel(this.test).model.findOne({
          'order_lines': {
            $elemMatch: {
              'product_instance_id': mongoose.Types.ObjectId(foundProduct.instance._id),
              'tickets': {
                $elemMatch: {
                  'receiver_id': mongoose.Types.ObjectId(user.warehouse_id),
                  'is_processed': false,
                  'status': {
                    $in: [
                      _const.ORDER_STATUS.default,
                      _const.ORDER_STATUS.WaitForOnlineWarehouse,
                      _const.ORDER_STATUS.WaitForInvoice,
                      _const.ORDER_STATUS.Delivered,
                    ]
                  }
                }
              }
            }
          }
        }).lean()
      })
      .then(order => {
        const DSS = require('./dss.model');
        return new DSS(TicketAction.test).afterScan(order, foundProduct, user);
      })
  }

  requestOnlineWarehouse(order, orderLine, user) {

    if (!orderLine.product_instance_id)
      return Promise.reject(error.barcodeNotFound);

    const Offline = require('./offline.model');

    return new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user)
      .then(res => {
        return super.setTicket(order, orderLine, _const.ORDER_STATUS.WaitForOnlineWarehouse, user.id, user.warehouse_id)
      })
      .then(res => {
        socket.sendToNS(user.warehouse_id);
      })
  }
  requestInvoice(orderId, user) {

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId))
      return Promise.reject(error.invalidId);

    const OrderModel = require('./order.model');
    let foundOrder;

    return new OrderModel(this.test).model.aggregate([
      {
        $match: {'_id': mongoose.Types.ObjectId(orderId)}
      }, {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'customer',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
        }
      }, {
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'product',
          localField: 'order_lines.product_id',
          foreignField: '_id',
          as: 'product'
        }
      }, {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $unwind: {
          path: '$product.instances', // it makes product.instances, single element array for each instance
          preserveNullAndEmptyArrays: true
        }
      }, {
        $project: {
          _id: 1,
          instance: {
            'barcode': '$product.instances.barcode',
          },
          order_lines: 1,
          customer: 1,
          cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
        }
      }, {
        $match: {
          cmp_value: {$eq: 0}
        }
      }, {
        $group: {
          _id: '$_id',
          instances: {$push: '$instance.barcode'},
          order_lines: {$push: '$order_lines'},
          customer: {$first: '$customer'}
        }
      }
    ]).then(res => {
      foundOrder = res[0];
      if (!foundOrder)
        return Promise.reject(error.orderNotFound);

      const Offline = require('./offline.model');
      return new Offline(this.test).requestInvoice(foundOrder, user)
    }).then(res => {
      return Promise.all(foundOrder.order_lines.map(ol => super.setTicket(foundOrder, ol, _const.ORDER_STATUS.WaitForInvoice, user.id, user.warehouse_id)))
    })
      .then(res => {
        socket.sendToNS(user.warehouse_id);
      })
  }

  async returnOrderLine(body) {
    const AgentModel = require('./agent.model');

    if (!mongoose.Types.ObjectId.isValid(body.orderId) || !mongoose.Types.ObjectId.isValid(body.orderLineId))
      return Promise.reject(error.invalidId);

    try {
      // find receiver
      const receiver = await new AgentModel(this.test).getSalesManager();
      // find order for check tickets have is_processed true
      // let _orderLine = await models['Order' + (this.test ? 'Test' : '')].findOne({
      //   "_id": mongoose.Types.ObjectId(body.orderId),
      // });
      let _order = await models['Order' + (this.test ? 'Test' : '')].aggregate([{
        $match: {
          "_id": mongoose.Types.ObjectId(body.orderId),
        }
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          "order_lines._id": mongoose.Types.ObjectId(body.orderLineId)
        }
      },
      {
        $match: {
          'order_lines.tickets.status': _const.ORDER_STATUS.Delivered
        }
      },
      {
        $project: {
          _id: 1,
          order_line: "$order_lines"
        }
      },

      ]).exec().then(res => res[0]);

      if (_order) {
        return super.addNewTicket(
          _order,
          _order.order_line,
          _const.ORDER_STATUS.Return,
          receiver._id,
          body.desc);
      } else throw error.ticketStatusNotDelivered
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async cancelOrderLine(body, user) {
    const AgentModel = require('./agent.model');
    const CustomerModel = require('./customer.model');

    if (!mongoose.Types.ObjectId.isValid(body.orderId) || !mongoose.Types.ObjectId.isValid(body.orderLineId))
      return Promise.reject(error.invalidId);

    try {
      const receiver = await new AgentModel(this.test).getSalesManager();
      let _order = await models['Order' + (this.test ? 'Test' : '')].aggregate([{
        $match: {
          "_id": mongoose.Types.ObjectId(body.orderId),
        }
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          "order_lines._id": mongoose.Types.ObjectId(body.orderLineId)
        }
      },
      {
        $match: {
          $and: [
            {'order_lines.tickets.status': {$ne: _const.ORDER_STATUS.OnDelivery}},
            {'order_lines.tickets.status': {$ne: _const.ORDER_STATUS.Delivered}},
          ]
        }
      },
      {
        $project: {
          _id: 1,
          order_line: "$order_lines"
        }
      },

      ]).exec().then(res => res[0]);


      // Dont have ticket status that state OnDelivery or Delivered
      if (_order) {
        // set balance
        const userBalance = user.balance + _order.order_line.paid_price;  // get orderline paid_price
        await super.setTicket(
          _order,
          _order.order_line,
          _const.ORDER_STATUS.Cancel,
          user._id,
          receiver._id,
        );
        const userUpdate = await new CustomerModel(this.test).updateByOfflineSystem(user.mobile_no, user.loyalty_points, userBalance);
        if (userUpdate) return Promise.resolve({result: true});
      } else throw error.ticketAlreadySetOnDelivery
    } catch (err) {
      console.log(err);
      throw err;
    }
  }






}

module.exports = TicketAction;