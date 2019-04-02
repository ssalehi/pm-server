const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const helpers = require('./helpers');
const env = require('../env');
const _const = require('./const.list');
const OfflineWarehouse = require('./offline_warehouse.model');


class Offline {

  constructor(test) {
    this.test = test;
  }

  async getWarehouses() {
    try {
      let online = await new OfflineWarehouse(this.test).getOnline();
      let damage = await new OfflineWarehouse(this.test).getDamage();
      let warehouses = await new WarehouseModel(this.test).getWarehouses();

      if (!online || !damage || !warehouses || !warehouses.length)
        throw new Error('warehouses not found');


      return {online, damage, warehouses};
    } catch (err) {
      console.log('-> error on get all warehouses', err);
      throw err;
    }
  }

  async getTransferInfo(type, warehouseId) {
    try {
      let {online, damage, warehouses} = await this.getWarehouses();
      let warehouse = warehouses.find(x => x._id.toString() === warehouseId.toString());

      if (!warehouse)
        throw new Error('warehouse not found');

      let src, dst;
      switch (type) {
        case _const.TRANSFER_TYPE.WarehouseToOnline:
          src = warehouse;
          dst = online;
          break;
        case _const.TRANSFER_TYPE.OnlineToWarehouse:
          src = online;
          dst = warehouse;
          break;
        case _const.TRANSFER_TYPE.WarehouseToLost:
          src = warehouse;
          dst = damage;
          break;
        case _const.TRANSFER_TYPE.OnlineToLost:
          src = online;
          dst = damage;
          break;
      }

      if (!src || !dst)
        throw new Error('source or destination of transfer is not valid');

      return {src, dst};

    } catch (err) {
      console.log('-> error on get source destination of offline interface', err);
      throw err;
    }
  }

  async getWarehouseByCode(inventoryCode, branchCode) {
    try {
      let {warehouses} = await this.getWarehouses();


      let foundWarehouse = warehouses.find(x => x.branch_code === branchCode && x.inventory_code === inventoryCode);
      if (foundWarehouse)
        return Promise.resolve(foundWarehouse);
      else
        throw new Error('no warehouse found for current branch and inventory code');

    } catch (err) {
      console.log('-> error on get warehouse by code', err);
      throw err;
    }

  }
  async transferRequest(orderId, orderLineId, barcode, user, type) {
    try {

      if (this.test)
        return Promise.resolve();


      let {src, dst} = await this.getTransferInfo(type, user.warehouse_id);

      return helpers.httpPost(`http://${env.serviceAddress}/${env.serviceTransferAPI}`, {
        orderId: orderId.toString(),
        orderLineId: orderLineId.toString(),
        userId: user.id.toString(),
        warehouseId: user.warehouse_id.toString(),
        barcode,
        src,
        dst
      });
    } catch (err) {
      console.log('-> error on transfer request', err);
      throw err;
    }
  }

  async transferResponse(body) {
    try {
      if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
        !body.orderLineId || !mongoose.Types.ObjectId.isValid(body.orderLineId) ||
        !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
        !body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId)
      ) {
        throw new Error('incomplete transfer resoponse data');
      }

      const DSS = require('./dss.model');
      const OrderModel = require('./order.model');

      let foundOrder = await new OrderModel(this.test).getById(mongoose.Types.ObjectId(body.orderId));
      if (!foundOrder)
        throw error.orderNotFound;

      let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === body.orderLineId);

      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const dss = new DSS(this.test);

      const lastTicket = dss.getLastTicket(foundOrderLine);

      if ([
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
        _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
      ].includes(lastTicket.status))

        return new DSS(this.test).afterWarehouseToOnlineTransfer(foundOrder, foundOrderLine, body.userId, body.warehouseId);

      else if ([
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
        _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled,
      ].includes(lastTicket.status))

        return new DSS(this.test).afterOnlineToWarehouseTransfer(foundOrder, foundOrderLine, body.userId, body.warehouseId);

      else if ([
        _const.ORDER_LINE_STATUS.WaitForLost,
      ].includes(lastTicket.status))
        return new DSS(this.test).afterToLostTransfer(foundOrder, foundOrderLine, body.warehouseId);

      else
        throw new Error('invalid transfer type')

    } catch (err) {
      console.log('-> error on transfer response', err);
      throw err;
    }
  }

  async receiveRequest(orderId, orderLineId, barcode, user, type) {
    try {
      if (this.test)
        return Promise.resolve();


      let {damage, warehouses} = await this.getWarehouses();

      let apiName, dst;

      switch (type) {
        case _const.RECEIVE_TYPE.DamageWithRefund:
          apiName = env.serviceReturnAPI;
          dst = damage
          break;
        case _const.RECEIVE_TYPE.DamageWithoutRefund:
          apiName = env.serviceEnterAPI;
          dst = damage
          break;

        case _const.RECEIVE_TYPE.Lost:
          apiName = env.serviceEnterAPI;
          dst = damage
          break;

        case _const.RECEIVE_TYPE.Warehouse:
          apiName = env.serviceEnterAPI;
          dst = warehouses.find(x => !x.has_customer_pickup && !x.is_hub);
          break;
      }

      if (!apiName)
        throw new Error('api name of return receive type is not defined');

      if (!dst)
        throw new Error('destination of receive type is not defiend');

      return helpers.httpPost(`http://${env.serviceAddress}/${apiName}`, {
        orderId: orderId.toString(),
        orderLineId: orderLineId.toString(),
        userId: user.id.toString(),
        warehouseId: user.warehouse_id.toString(),
        barcode,
        dst
      });
    } catch (err) {
      console.log('-> error on receive request', err);
      throw err;
    }
  }

  async receiveResponse(body) {
    try {

      const DSS = require('./dss.model');

      if (body.orderLineId && mongoose.Types.ObjectId.isValid(body.orderLineId) &&
        body.orderId && mongoose.Types.ObjectId.isValid(body.orderId) &&
        body.userId && mongoose.Types.ObjectId.isValid(body.userId) &&
        body.warehouseId && mongoose.Types.ObjectId.isValid(body.warehouseId)) {

        const OrderModel = require('./order.model');

        let foundOrder = await new OrderModel(this.test).getById(mongoose.Types.ObjectId(body.orderId));
        if (!foundOrder)
          throw error.orderNotFound;

        let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === body.orderLineId);

        if (!foundOrderLine)
          throw error.orderLineNotFound;

        const dss = new DSS(this.test);

        const lastTicket = dss.getLastTicket(foundOrderLine);

        if ([
          _const.ORDER_LINE_STATUS.WaitForDamageWithRefund,
          _const.ORDER_LINE_STATUS.WaitForDamageWithoutRefund,
          _const.ORDER_LINE_STATUS.DamageWithRefundVerified,
          _const.ORDER_LINE_STATUS.DamageWithoutRefundVerified,
        ].includes(lastTicket.status)) {

          return new DSS(this.test).afterReceiveDamaged(foundOrder, foundOrderLine, body.userId, body.warehouseId);
        }
        else if ([
          _const.ORDER_LINE_STATUS.WaitForLost,
          _const.ORDER_LINE_STATUS.LostVerified,
        ].includes(lastTicket.status)) {

          return new DSS(this.test).afterReceiveLost(foundOrder, foundOrderLine, body.userId, body.warehouseId);
        }
      }
      else if (body.barcode && body.branch_code && body.inventory_code, body.count) {
        let foundWarehouse = await this.getWarehouseByCode(body.inventory_code, body.branch_code);
        return new DSS(this.test).afterReceiveWarehouse(body.barcode, body.count, foundWarehouse);
      }
      else
        throw new Error('invalid receive data');

    } catch (err) {
      console.log('-> error on receive request', err);
      throw err;
    }
  }

  async manualRequestInvoice(orderId, user) {
    try {
      let OrderModel = require('./order.model');
      let foundOrder = await new OrderModel(this.test).getById(orderId);

      if (!foundOrder)
        throw error.orderNotFound;


      return this.invoiceRequest(foundOrder, user);

    } catch (err) {
      console.log('-> error on manual invoice request', err);
      throw err;
    }

  }

  async invoiceRequest(order, user) {
    try {

      if (this.test)
        return Promise.resolve();


      let warehouses = await new WarehouseModel(this.test).getAll();
      let foundWarehouse = warehouses.find(x => x._id.toString() === user.warehouse_id);


      if (!foundWarehouse || (!foundWarehouse.is_hub && !foundWarehouse.has_customer_pickup))
        throw error.WarehouseNotFound;

      let instanceIds = [];

      order.order_lines.forEach(x => {
        if (!x.cancel)
          instanceIds.push(x.product_instance_id);
      })

      let instances = await new ProductModel(this.test).getInstancesById(instanceIds);

      let detail = [];

      order.order_lines.forEach(x => {
        if (x.cancel)
          return;

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

      return helpers.httpPost(`http://${env.serviceAddress}/${env.servcieInvoiceAPI}`, {
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

  invoiceResponse(body) {

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

  async makeTestOrder(id) {

    try {

      let OrderModel = require('./order.model');
      let order = new OrderModel(this.test);

      if (id === "1") {

        let res = await order.OrderModel.findOneAndUpdate({
          customer_id: '5c446744e9db0b0021de97c0'
        }, {

            "is_cart": false,
            "transaction_id": "xy-79483",
            "order_lines": [
              {
                "product_price": 1761000,
                "paid_price": 1761000,
                "cancel": false,
                "_id": mongoose.Types.ObjectId("5c4852923d98ea001bc8d94b"),
                "product_id": mongoose.Types.ObjectId("5b6fefdbd81843b40eb8f0fd"),
                "product_instance_id": mongoose.Types.ObjectId("5b6fefdb01f471001c359b8f"),
                "adding_time": new Date("2019-01-23T11:40:02.302Z"),
                "tickets": [
                  {
                    "is_processed": true,
                    "_id": mongoose.Types.ObjectId("5c48c04913d56a001ccc2e98"),
                    "status": 1,
                    "desc": null,
                    "receiver_id": mongoose.Types.ObjectId("5b6e6c4a486ddf00066decab"),
                    "timestamp": new Date("2019-01-23T19:28:09.851Z"),
                    "agent_id": mongoose.Types.ObjectId("5c33b49f4730b40031ae9de1")
                  },
                  {
                    "is_processed": false,
                    "_id": mongoose.Types.ObjectId("5c48c04913d56a001ccc2e98"),
                    "status": 2,
                    "desc": null,
                    "receiver_id": mongoose.Types.ObjectId("5b6e6c4a486ddf00066decab"),
                    "timestamp": new Date("2019-01-23T19:28:09.851Z")
                  }
                ]
              },
              {
                "product_price": 148000,
                "paid_price": 148000,
                "cancel": false,
                "_id": mongoose.Types.ObjectId("5c4852a63d98ea001bc8d94c"),
                "product_id": mongoose.Types.ObjectId("5b6ff045d81843b40ebb3db5"),
                "product_instance_id": mongoose.Types.ObjectId("5b6ff04501f471001c3789ed"),
                "adding_time": new Date("2019-01-23T11:40:22.674Z"),
                "tickets": [
                  {
                    "is_processed": true,
                    "_id": mongoose.Types.ObjectId("5c48c04913d56a001ccc2e9e"),
                    "status": 1,
                    "desc": null,
                    "receiver_id": mongoose.Types.ObjectId("5b6e6c4a486ddf00066decab"),
                    "timestamp": new Date("2019-01-23T19:28:09.873Z"),
                    "agent_id": mongoose.Types.ObjectId("5c33b49f4730b40031ae9de1")
                  },
                  {
                    "is_processed": false,
                    "_id": mongoose.Types.ObjectId("5c48c04913d56a001ccc2e99"),
                    "status": 2,
                    "desc": null,
                    "receiver_id": mongoose.Types.ObjectId("5b6e6c4a486ddf00066decab"),
                    "timestamp": new Date("2019-01-23T19:28:09.851Z")
                  }
                ]
              }
            ],
            "tickets": [
              {
                "is_processed": false,
                "_id": mongoose.Types.ObjectId("5c48c04913d56a001ccc2e92"),
                "status": 1,
                "desc": null,
                "timestamp": new Date("2019-01-23T19:28:09.824Z")
              }
            ],
            "IPG_data": {
              "result": null,
              "action": "1003",
              "invoice_number": "5c48c04913d56a001ccc2e8e",
              "invoice_date": "2019/01/23 19:28:09",
              "transaction_id": null,
              "trace_number": null,
              "reference_number": null,
              "transaction_date": null,
              "terminal_code": "1674396",
              "merchant_code": "4493361",
              "amount": 1909000
            },
            "address": {
              "_id": mongoose.Types.ObjectId("5c4852c53d98ea001bc8d94d"),
              "province": "تهران",
              "city": "تهران",
              "street": "1",
              "unit": "1",
              "no": "1",
              "district": "تهران",
              "recipient_title": "m",
              "recipient_name": "آیدین",
              "recipient_surname": "کلانتری",
              "recipient_national_id": "0010684281",
              "recipient_mobile_no": "09125502897",
              "postal_code": "1",
              "loc": {
                "long": 51.379926,
                "lat": 35.696491
              }
            },
            "delivery_info": {
              "time_slot": {
                "lower_bound": 10,
                "upper_bound": 18
              }
            },
            "is_collect": false,
            "total_amount": 1909000

          }, {upsert: true, new: true});

        return Promise.resolve(res);

      }



    } catch (err) {
      console.log('-> error on make test order', err);
      throw err;
    }




  }

}

module.exports = Offline;

