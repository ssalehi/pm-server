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



  requestOnlineWarehouse(orderId, orderLineId, barcode, user) {
    if (this.test)
      return Promise.resolve();

    return new WarehouseModel(this.test).model.findById(mongoose.Types.ObjectId(user.warehouse_id))
      .then(res => {

        if (!res || !res.ip_address)
          return Promise.reject(error.WarehouseNotFound);

        return helpers.httpPost(`http://${res.ip_address}/${env.onlineWarehouseAPI}`, {
          orderId: orderId.toString(),
          orderLineId: orderLineId.toString(),
          warehouseId: user.warehouse_id.toString(),
          userId: user.id.toString(),
          barcode
        });
      })


  }

  verifyOnlineWarehouse(body) {

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
      !body.orderLineId || !mongoose.Types.ObjectId.isValid(body.orderLineId) ||
      !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
      !body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId)
    ) {
      return Promise.reject(error.invalidId);
    }

    const DSS = require('./dss.model');
    return new DSS(this.test).afterOnlineWarehouseVerification(body.orderId, body.orderLineId, body.userId, body.warehouseId);
  }

  requestInvoice(order, user) {
    if (this.test)
      return Promise.resolve();

    return new WarehouseModel(this.test).model.findById(mongoose.Types.ObjectId(user.warehouse_id))
      .then(res => {

        if (!res || !res.ip_address)
          return Promise.reject(error.WarehouseNotFound);

        return helpers.httpPost(`${res.ip_address}/${env.invoiceAPI}`, {
          orderId: order._id.toString(),
          mobileNo: order.customer.mobile_no,
          usedPoint: 0,
          usedBalance: 0,
          instances: order.instances,
          warehouseId: user.warehouse_id.toString(),
          userId: user.id.toString()
        });
      })

  }

  verifyInvoice(body) {

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
      !body.invoiceNo ||
      !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
      !body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId)
    ) {
      return Promise.reject(error.invalidId);
    }

    const DSS = require('./dss.model');
    return new DSS(this.test).afterInvoiceVerification(body.orderId, body.invoiceNo, body.userId, body.warehouseId);
  }
}

module.exports = Offline;

