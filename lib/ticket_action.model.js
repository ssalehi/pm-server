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

  async newScan(body, user) {

    try {
      if (!body.barcode)
        throw error.barcodeNotFound;

      switch (trigger) {
        case _const.SCAN_TRIGGER.Inbox:
          break;
        case _const.SCAN_TRIGGER.SendInternal:
          break;
        case _const.SCAN_TRIGGER.SendCustomer:
          break;
        case _const.SCAN_TRIGGER.CCDelivery:
          break;
        default:
          throw error.invalidScanTrigger;
      }

      return this.inboxScan(body.barcode, user);

    } catch (err) {
      console.log('-> error on new scan', err);
      throw err;
    }
  }

  async inboxScan(barcode, user) {
    try {
      const OrderModel = require('./order.model');
      let foundProduct = await new ProductModel(this.test).getInstanceByBarcode(barcode);

      if (!foundProduct)
        throw error.productNotFound;

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
      return new DSS(TicketAction.test).afterInboxScan(foundOrder, foundProduct, user);
    } catch (err) {
      console.log('-> error on   ');
      throw err;
    }
  }

  async returnOrderLine(body) {
    
  }

  async cancelOrderLine(body, user) {


    

  }

  async requestOnlineWarehouse(order, orderLine, user) {

    try {
      if (!orderLine.product_instance_id)
        throw error.barcodeNotFound;

      const Offline = require('./offline.model');
      await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user)

      await super.setOrderLineAsWatingForOnlineWarehouse(order, orderLine, user._id, user.warehouse_id);

      if (!this.test)
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


      await new DSS(TicketAction.test).afterMismatch(orders, user);

      let orderIds = new Set(orders.map(x => x._id.toString()));
      orderIds = Array.from(orderIds);

      for (let i = 0; i < orderIds.length; i++) {

        let order = orders.find(x => x._id.toString() === orderIds[i]); // get first order of same orders
        await super.setOrderAsWaitingForAggregation(order);
      }
      return Promise.resolve();
    }
    catch (err) {
      console.log('-> ', 'error on mismatch report');
      throw err;
    }
  }

}

module.exports = TicketAction;