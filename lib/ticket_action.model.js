const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');
const Ticket = require('./ticket.model');

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
                      _const.ORDER_STATUS.ReadyForInvoice,
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

    return new OrderModel(this.test).model.aggregate([
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
      , {
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
          instances: {
            $push:
            {
              barcode: '$instance.barcode'
            }
          }
        }
      },
    ]).then(res => {
      const Offline = require('./offline.model');

      return new Offline(this.test).requestInvoice(res, user)

    })







  }







}

module.exports = TicketAction;
