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

  constructor(test, session) {
    this.test = test;
    this.session = session;
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


  async makeTestOrder(id) {

    try {

      let OrderModel = require('./order.model');
      let order = new OrderModel(this.test);

      if (id === "1") {

        await order.OrderModel.update({
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
              "terminal_code": "1660557",
              "merchant_code": "4480470",
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

          }, {upsert: true, new: true, session: this.session});

        return Promise.resolve('done');

      }



    } catch (err) {
      console.log('-> error on make test order', err);
      throw err;
    }




  }

}

module.exports = Offline;

