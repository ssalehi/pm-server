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

  async newScan(barcode, user) {

    try {
      if (!barcode)
        throw error.barcodeNotFound;
      const OrderModel = require('./order.model');
      let foundProduct = await new ProductModel(this.test).getInstanceByBarcode(barcode);
      let foundOrder = await new OrderModel(this.test).model.findOne({
        'order_lines': {
          $elemMatch: {
            'product_instance_id': mongoose.Types.ObjectId(foundProduct.instance._id),
            'tickets': {
              $elemMatch: {
                'receiver_id': mongoose.Types.ObjectId(user.warehouse_id),
                'is_processed': false,
                'status': {
                  $in: [
                    _const.ORDER_LINE_STATUS.default,
                    _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                    _const.ORDER_LINE_STATUS.Renew,
                    _const.ORDER_LINE_STATUS.Delivered,
                  ]
                }
              }
            }
          }
        }
      }).lean();
      if (!foundOrder)
        throw error.orderNotFound;
      const DSS = require('./dss.model');
      return new DSS(TicketAction.test).afterScan(foundOrder, foundProduct, user);
    } catch (err) {
      console.log('-> error on new scan', err);
      throw err;
    }
  }

  async requestOnlineWarehouse(order, orderLine, user) {

    try {
      if (!orderLine.product_instance_id)
        throw error.barcodeNotFound;

      const Offline = require('./offline.model');
      await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user)
      await super.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse, user.id, user.warehouse_id)
      socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> error on request online warehouse', err);
      throw err
    }
  }
  async requestInvoice(orderId, user) {

    try {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId))
        throw error.invalidId;

      const OrderModel = require('./order.model');

      let res = await new OrderModel(this.test).model.aggregate([
        {
          $match: {'_id': mongoose.Types.ObjectId(orderId)}
        }
        , {
          $unwind: {
            path: '$order_lines',
            preserveNullAndEmptyArrays: true
          }
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
          $lookup: {
            from: 'product',
            localField: 'order_lines.product_id',
            foreignField: '_id',
            as: 'product'
          }
        }
        ,
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        }
        ,
        {
          $unwind: {
            path: '$product.instances', // it makes product.instances, single element array for each instance
            preserveNullAndEmptyArrays: true
          }
        }
        ,
        {
          $project: {
            _id: 1,
            customer: 1,
            instance: {
              'barcode': '$product.instances.barcode',
            },
            cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
          }
        }
        ,
        {
          $match: {
            cmp_value: {$eq: 0}
          }
        }
        ,
        {
          $group: {
            _id: '$_id',
            customer: {$first: '$customer'},
            instances: {
              $push:
              {
                barcode: '$instance.barcode'
              }
            }
          }
        }]);
      const Offline = require('./offline.model');
      return new Offline(this.test).requestInvoice(res, user)

    } catch (err) {
      console.log('-> ', 'error on request invoice');
      throw err;
    }

  }

  async returnOrderLine(body) {
    const AgentModel = require('./agent.model');

    if (!mongoose.Types.ObjectId.isValid(body.orderId) || !mongoose.Types.ObjectId.isValid(body.orderLineId))
      return Promise.reject(error.invalidId);

    try {
      // find receiver
      const receiver = await new AgentModel(this.test).getSalesManager();
      // find order for check tickets have is_processed true
      // let _orderLine = await models()['Order' + (this.test ? 'Test' : '')].findOne({
      //   "_id": mongoose.Types.ObjectId(body.orderId),
      // });
      let _order = await models()['Order' + (this.test ? 'Test' : '')].aggregate([{
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
          'order_lines.tickets.status': _const.ORDER_LINE_STATUS.Delivered
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
          _const.ORDER_LINE_STATUS.Return,
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
      let _order = await models()['Order' + (this.test ? 'Test' : '')].aggregate([{
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
            {'order_lines.tickets.status': {$ne: _const.ORDER_LINE_STATUS.OnDelivery}},
            {'order_lines.tickets.status': {$ne: _const.ORDER_LINE_STATUS.Delivered}},
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
          _const.ORDER_LINE_STATUS.Cancel,
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

  async mismatchReport(trigger, user) {
    try {
      if (!user.warehouse_id)
        throw error.warehouseIdRequired;

      const DSS = require('./dss.model');
      // each ordrer contain only one order line
      let orders;
      switch (trigger) {
        case _const.MISMATCH_TRIGGER.Inbox:
          orders = await super.getRemainder(mongoose.Types.ObjectId(user.warehouse_id), [
            _const.ORDER_LINE_STATUS.default,
            _const.ORDER_LINE_STATUS.Renew,
            _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
            _const.ORDER_LINE_STATUS.Delivered
          ]);
          break;
        case _const.MISMATCH_TRIGGER.Send:
          orders = await super.getRemainder(mongoose.Types.ObjectId(user.warehouse_id), [
            _const.ORDER_LINE_STATUS.DeliverySet,
            _const.ORDER_LINE_STATUS.ReadyToDeliver,
          ]);
          break;
        // direct delivery to customer mismatch (C&C)
        case _const.MISMATCH_TRIGGER.Deliver:
          orders = await super.getRemainder(mongoose.Types.ObjectId(user.warehouse_id), [
            _const.ORDER_LINE_STATUS.ReadyToDeliver,
          ], true);
          break;
      }
      if (!orders || !orders.length)
        throw error.orderNotFound; 

      return new DSS(TicketAction.test).afterMismatch(orders, user);
    }
    catch (err) {
      console.log('-> ', 'error on mismatch report');
      throw err;
    }
  }

}

module.exports = TicketAction;