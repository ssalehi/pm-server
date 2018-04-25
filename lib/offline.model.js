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

    return _orderModel.OrderModel.findById(mongoose.Types.ObjectId(body.orderId))
      .then(res => {
        order = res;
        let foundOrderLine = order.order_lines.find(x => x._id.toString() === body.orderLineId);

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

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
          return this.afterVerifyOnlineAction(body);
        }
        else {
          return Promise.reject(error.invalidInventoryCount);
        }
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
      !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
      !body.mobileNo || !body.point || !body.balance) {
      return Promise.reject(error.invalidId);
    }
    
    const OrderModel = require('./order.model');
    const _orderModel = new OrderModel(this.test);

    return new CustomerModel(this.test).updateByOfflineSystem(body.mobileNo, body.point, body.balance)
      .then(res => {
        let user = {
          id: body.userId,
          warehouse_id: body.warehouseId
        };
        
        return _orderModel.setManualTicket('deliver', body, user);
      })
  }


  afterVerifyOnlineAction(body) {
    new WarehouseModel(this.test).getAllWarehouses()
      .then(res => {

        let foundWarehouse = res.find(x => x._id.toString() === body.warehouseId)

        if (!foundWarehouse)
          return Promise.reject(error.WarehouseNotFound)

        let user = {
          id: body.userId,
          warehouse_id: body.warehouseId
        };

        const OrderModel = require('./order.model');
        const _orderModel = new OrderModel(this.test);

        if (foundWarehouse.is_center) {

          return _orderModel.setManualTicket('invoice', body, user)
        }
        else {
          return _orderModel.setManualTicket('deliver', body, user);
        }
      })



  }


}

module.exports = Offline;

