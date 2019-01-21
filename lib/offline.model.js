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



  async requestOnlineWarehouse(orderId, orderLineId, barcode, user, reverse = false) {
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
        barcode,
        reverse
      });

    } catch (err) {
      console.log('-> error on request online warehouse', err);
      throw err;
    }

  }

  onlineWarehouseResponse(body) {

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
      !body.orderLineId || !mongoose.Types.ObjectId.isValid(body.orderLineId) ||
      !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
      !body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId)
    ) {
      return Promise.reject(error.invalidId);
    }

    const DSS = require('./dss.model');
    return new DSS(this.test).afterOnlineWarehouseResponse(body.orderId, body.orderLineId, body.userId, body.warehouseId, body.reverse);
  }


  async manualRequestInvoice(orderId, user) {
    try {
      let OrderModel = require('./order.model');
      let foundOrder = await new OrderModel(this.test).getById(orderId);

      if (!foundOrder)
        throw error.orderNotFound;


      return this.requestInvoice(foundOrder, user);

    } catch (err) {
      console.log('-> error on manual invoice request', err);
      throw err;
    }

  }

  async requestInvoice(order, user) {
    try {

      if (this.test)
        return Promise.resolve();


      let warehouses = await new WarehouseModel(this.test).getAll();
      let foundWarehouse = warehouses.find(x => x._id.toString() === user.warehouse_id);


      if (!foundWarehouse || !foundWarehouse.ip_address || (!foundWarehouse.is_hub && !foundWarehouse.has_customer_pickup))
        throw error.WarehouseNotFound;

      let instanceIds = [];

      order.order_lines.forEach(x => {
        instanceIds.push(x.product_instance_id);
      })

      let instances = await new ProductModel(this.test).getInstancesById(instanceIds);

      let detail = [];

      order.order_lines.forEach(x => {
        let foundInstance = instances.find(y => y.instance_id.toString() === x.product_instance_id.toString())
        if (!foundInstance)
          throw new Error('product instance not found ');

        let foundPreDetail = detail.find(y => y.barcode === foundInstance.barcode)
        if (foundPreDetail) {
          foundPreDetail.qty++;
          foundPreDetail.retailPrice += x.paid_price;
          foundPreDetail.discountValue += (foundInstance.price - x.paid_price);
        } else {
          detail.push({
            qty: 1,
            retailPrice: x.paid_price,
            discountValue: foundInstance.price - x.paid_price
          })
        }
      })

      // make avarage on those order details which have more than 1 qty
      detail.map(x => {
        if (x.qty > 1) {
          x.retailPrice = x.retailPrice / qty;
          x.discountValue = x.discountValue / qty
        }
        return x;
      })



      return helpers.httpPost(`http://${foundWarehouse.ip_address}/${env.invoiceAPI}`, {
        orderId: order._id.toString(),
        customerMobile: '09125975886', //order.customer.mobile_no,
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

