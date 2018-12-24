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



  async requestOnlineWarehouse(orderId, orderLineId, barcode, user) {
    try {

      if (this.test)
        return Promise.resolve();


      let warehouse = (await new WarehouseModel(this.test).getAll()).find(x => x._id.toString() === user.warehouse_id);

      if (!warehouse || !warehouse.ip_address)
        return Promise.reject(error.WarehouseNotFound);

      return helpers.httpPost(`http://${warehouse.ip_address}/${env.onlineWarehouseAPI}`, {
        orderId: orderId.toString(),
        orderLineId: orderLineId.toString(),
        warehouseId: user.warehouse_id.toString(),
        userId: user.id.toString(),
        barcode
      });

    } catch (err) {
      console.log('-> erron on request online warehoue', err);
      throw err;
    }

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

  async requestInvoice(order, user) {
    try {

      if (this.test)
        return Promise.resolve();

      if (order && order.length)
        order = order[0];
      else
        throw error.orderNotFound;

      if (this.test)
        return Promise.resolve();

      let res = await new WarehouseModel(this.test).model.findById(mongoose.Types.ObjectId(user.warehouse_id))

      if (!res || !res.ip_address)
        throw error.WarehouseNotFound;

      let instanceIds = [];

      order.forEach(x => {
        instanceIds = instanceIds.concat(x.order_lines.map(y => y.product_instance_id));
      })

      let instances = await new ProductModel(this.test).getInstancesById(instanceIds);

      let detail = [];

      order.forEach(x => {
        y.order_lines.forEach(y => {
          let foundInstance = instances.find(z => z.instance_id.toString() === y.product_instance_id.toString())

          let foundPreDetail = detail.find(z => z.barcode === foundInstance.barcode)
          if (foundPreDetail) {
            foundPreDetail.qty++;
            foundPreDetail.retailPrice += y.paid_price;
            foundPreDetail.discountValue += (foundInstance.price - y.paid_price);
          } else {
            detail.push({
              qty: 1,
              retailPrice: y.paid_price,
              discountValue: foundInstance.price - y.paid_price
            })
          }
        })
      });

      // make avarage on those order details which have more than 1 qty
      detail.map(x => {
        if (x.qty > 1) {
          x.retailPrice = x.retailPrice / qty;
          x.discountValue = x.discountValue / qty
        }
        return x;
      })

      return helpers.httpPost(`http://${res.ip_address}/${env.invoiceAPI}`, {
        orderId: order._id.toString(),
        customerMobile: order.customer.mobile_no,
        discountValue: 0,
        loyaltyDiscountValue: 0,
        warehouseId: user.warehouse_id.toString(),
        userId: user.id.toString(),
        detail
      });
    } catch (err) {
      console.log('-> error on request invoice: ', err);
      throw err;
    }

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
    return new DSS(this.test).afterInvoiceVerification(body.orderId, body.invoiceNo, body.userId, body.warehouseId, body.points);
  }
}

module.exports = Offline;

  