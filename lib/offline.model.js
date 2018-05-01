const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const helpers = require('./helpers');
const socket = require('../socket');
const _const = require('./const.list');
const env = require('../env');

class Offline {

  constructor(test) {
    this.test = test;
  }

  manualRequestOnlineWarehouse(orderId, orderLineId, user) {

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId) ||
      !orderLineId || !mongoose.Types.ObjectId.isValid(orderLineId))
      return Promise.reject(error.invalidId);


    const OrderModel = require('./order.model');
    const _orderModel = new OrderModel(this.test);

    _orderModel.model.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.orderNotFound);

        return this.requestOnlineWarehouse(res, orderLineId, user);

      })



  }

  requestOnlineWarehouse(order, orderLineId, user) {
    if (this.test)
      return Promise.resolve();

    let foundOrderLine = order.order_lines.find(x => x._id.toString() === orderLineId);
    let productId = foundOrderLine.product_id;
    let productInstanceId = foundOrderLine.product_instance_id;

    let productInstance;

    return new ProductModel(this.test).getInstance(productId.toString(), productInstanceId.toString())
      .then(res => {
        if (!res || !res.barcode)
          return Promise.reject(error.productInstanceNotExist);

        console.log('-> ', env.onlineWarehouseAPI);
        return helpers.httpPost(env.onlineWarehouseAPI, {
          orderId: order._id.toString(),
          orderLineId: orderLineId.toString(),
          warehouseId: user.warehouse_id.toString(),
          userId: user.id.toString(),
          barcode: res.barcode
        });
      })
  }

  verifyOnlineWarehouse(body) {

    let query;
    let order;

    const OrderModel = require('./order.model');
    const _orderModel = new OrderModel(this.test);

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
      !body.orderLineId || !mongoose.Types.ObjectId.isValid(body.orderLineId) ||
      !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
      !body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId)
    ) {
      return Promise.reject(error.invalidId);
    }

    return _orderModel.OrderModel.findById(mongoose.Types.ObjectId(body.orderId)).lean()
      .then(res => {
        order = res;

        let foundOrderLine = order.order_lines.find(x => x._id.toString() === body.orderLineId);

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        let foundActiveTicket = foundOrderLine.tickets.find(x => !x.is_processed)
        if (!foundActiveTicket || foundActiveTicket.status !== _const.ORDER_STATUS.WaitForOnlineWarehouse)
          return Promise.reject(error.noAccess);

        return new ProductModel(this.test).setInventory({
          id: foundOrderLine.product_id.toString(),
          productInstanceId: foundOrderLine.product_instance_id.toString(),
          warehouseId: body.warehouseId,
          delCount: -1,
          delReserved: -1
        });

      })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          return this.afterVerifyOnlineAction(order, body);
        }
        else {
          return Promise.reject(error.invalidInventoryCount);
        }
      })
  }


  manualRequestInvoice(orderId, orderLineId, user) {

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId) ||
      !orderLineId || !mongoose.Types.ObjectId.isValid(orderLineId))
      return Promise.reject(error.invalidId);


    const OrderModel = require('./order.model');
    const _orderModel = new OrderModel(this.test);

    _orderModel.model.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.orderNotFound);

        return this.requestInvoice(res, orderLineId, user.warehouse_id, user.id);

      })



  }

  requestInvoice(order, orderLineId, warehouseId, userId) {

    if (this.test)
      return Promise.resolve();

    let foundOrderLine = order.order_lines.find(x => x._id.toString() === orderLineId);
    let productId = foundOrderLine.product_id;
    let productInstanceId = foundOrderLine.product_instance_id;

    let customer, productInstance;

    return new ProductModel(this.test).getInstance(productId.toString(), productInstanceId.toString())
      .then(res => {
        if (!res || !res.barcode)
          return Promise.reject(error.productInstanceNotExist);

        productInstance = res;
        return new CustomerModel(this.test).getById(order.customer_id);
      })
      .then(res => {
        customer = res;
        if (!customer || !customer.mobile_no)
          return Promise.reject(error.noUsernameMobileNo);

        return helpers.httpPost(env.invoiceAPI, {
          orderId: order._id.toString(),
          orderLineId: orderLineId.toString(),
          warehouseId: warehouseId.toString(),
          userId: userId.toString(),
          mobileNo: customer.mobile_no,
          barcode: productInstance.barcode,
          usedPoint: order.used_point,
          usedBalance: order.used_balance,
          paidPrice: foundOrderLine.paid_price
        });
      })
  }

  verifyInvoice(body) {

    let query;
    let order;


    if (!body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId) ||
      !body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
      !body.orderLineId || !mongoose.Types.ObjectId.isValid(body.orderLineId) ||
      !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
      !body.mobileNo || !body.hasOwnProperty('point') || !body.hasOwnProperty('balance')) {
      return Promise.reject(error.invalidId);
    }

    const OrderModel = require('./order.model');
    const _orderModel = new OrderModel(this.test);


    return _orderModel.model.findById(mongoose.Types.ObjectId(body.orderId)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.orderNotFound);

        let foundOrderLine = res.order_lines.find(x => x._id.toString() === body.orderLineId);

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        let foundActiveTicket = foundOrderLine.tickets.find(x => !x.is_processed)
        if (!foundActiveTicket || foundActiveTicket.status !== _const.ORDER_STATUS.WaitForInvoice)
          return Promise.reject(error.noAccess);

        return new CustomerModel(this.test).updateByOfflineSystem(body.mobileNo, body.point, body.balance)
      })
      .then(res => {
        let user = {
          id: body.userId,
          warehouse_id: body.warehouseId
        };

        return _orderModel.setManualTicket('deliver', body, user);
      })
  }



  afterVerifyOnlineAction(order, body) {
    new WarehouseModel(this.test).getAllWarehouses()
      .then(res => {

        let foundWarehouse = res.find(x => x._id.toString() === body.warehouseId)

        if (!foundWarehouse)
          return Promise.reject(error.WarehouseNotFound)

        const centeralWarehouse = res.find(x => x.is_center);

        let user = {
          id: body.userId,
          warehouse_id: body.warehouseId
        };

        const OrderModel = require('./order.model');
        const _orderModel = new OrderModel(this.test);

        if (order.is_collect) { // C&C order: shuold set internal delivery ticket 

          let destinationShop = res.find(x => x.address._id.toString() === order.address._id.toString())
          if (!destinationShop)
            return Promise.reject(error.WarehouseNotFound);

          if (destinationShop._id.toString() === foundWarehouse._id.toString()) { // invoice should be requested
            return _orderModel.setManualTicket('invoice', body, user)
          }
          else if (foundWarehouse.is_center) { // form central to shop.
            body['toWarehouseId'] = destinationShop._id;
            return _orderModel.setManualTicket('internalDelivery', body, user)
          }
          else { // from shop to central => central will send product instance to destination shop later.
            body['toWarehouseId'] = centeralWarehouse._id;
            return _orderModel.setManualTicket('internalDelivery', body, user)
          }

        } else {
          if (foundWarehouse.is_center) {
            return _orderModel.setManualTicket('invoice', body, user)
          }
          else {
            body['toWarehouseId'] = centeralWarehouse._id;
            return _orderModel.setManualTicket('internalDelivery', body, user);
          }
        }

      })



  }


}

module.exports = Offline;

