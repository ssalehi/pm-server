const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const _const = require('./const.list');
const Ticket = require('./ticket.model');

class TicketAction extends Ticket {

  constructor(test) {
    super(test);
    this.test = test;
  }

  async newScan(body, user) {

    try {
      if (!body.barcode)
        throw error.barcodeNotFound;

      if (!body.trigger)
        throw error.scanTriggerNotFound;

      switch (body.trigger) {
        case _const.SCAN_TRIGGER.Inbox:
          return this.inboxScan(body.barcode, user);
        case _const.SCAN_TRIGGER.SendInternal:
          return this.finalScan(body.orderId, body.barcode, user);
        case _const.SCAN_TRIGGER.SendExternal:
          return this.finalScan(body.orderId, body.barcode, user, true);
        case _const.SCAN_TRIGGER.CCDelivery:
          return this.finalScan(body.orderId, body.barcode, user, false, true);
        default:
          throw error.invalidScanTrigger;
      }



    } catch (err) {
      console.log('-> error on new scan', err);
      throw err;
    }
  }

  async inboxScan(barcode, user) {
    try {
      let foundProduct = await new ProductModel(this.test).getInstanceByBarcode(barcode);

      if (!foundProduct)
        throw error.productNotFound;

      let foundOrder = await this.OrderModel.findOne({
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

  async finalScan(orderId, barcode, user, isExternal, isDestination) {
    try {
      let foundProduct = await new ProductModel(this.test).getInstanceByBarcode(barcode);

      if (!foundProduct)
        throw error.productNotFound;

      let foundOrder = await this.OrderModel.findOne({
        $and: [
          {
            '_id': mongoose.Types.ObjectId(orderId)
          },
          {
            'order_lines': {
              $elemMatch: {
                'product_instance_id': mongoose.Types.ObjectId(foundProduct.instance._id),
                'tickets': {
                  $elemMatch: {
                    'receiver_id': mongoose.Types.ObjectId(user.warehouse_id),
                    'is_processed': false,
                    'status': _const.ORDER_LINE_STATUS.FinalCheck,
                  }
                }
              }

            }
          }
        ]
      }).lean();
      if (!foundOrder)
        throw error.orderNotFound;

      const DSS = require('./dss.model');
      return new DSS(TicketAction.test).afterFinalCheck(foundOrder, foundProduct, user, isExternal, isDestination);
    } catch (err) {
      console.log('-> error on final scan ', err);
      throw err;
    }
  }


  async returnOrderLine(body) {

  }

  async cancelOrderLine(body, user) {
  }


  async requestInvoice(orderId, user) {

    try {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId))
        throw error.invalidId;

      let res = await this.OrderModel.aggregate([
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