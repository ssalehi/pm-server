const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const soap = require('soap-as-promised');
const IPG_URL = 'https://sep.shaparak.ir/payments/initpayment.asmx';
const IPG_MID = '123';
const CustomerModel = require('./customer.model');
const _const = require('./const.list');
const env = require('../env');
const helpers = require('./helpers');
const socket = require('../socket');

class Order extends Base {

  constructor(test = Order.test) {
    super('Order', test);
    this.OrderModel = this.model;
  }

  /**
   * @param body
   *  product_id: the id of the product
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to add
   * @returns {Promise.<*>}
   */
  addToOrder(user, body) {
    if (!user)
      return Promise.reject(error.noUser);
    if (!body)
      return Promise.reject(error.bodyRequired);

    let pid = body.product_id;
    let piid = body.product_instance_id;
    let n = body.number || 1;

    if (!mongoose.Types.ObjectId.isValid(piid) || !mongoose.Types.ObjectId.isValid(pid))
      return Promise.reject(error.invalidId);

    // TODO: should check if we have more than 'n' number of product instance in our inventory

    let newOrderLines = [];
    for (let i = 0; i < n; i++) {
      newOrderLines.push({
        product_id: pid,
        product_instance_id: piid
      });
    }

    return this.OrderModel.update({
      customer_id: user.id,
      is_cart: true,
    }, {
      $addToSet: {
        'order_lines': {
          $each: newOrderLines
        }
      }
    }, {
      upsert: true
    })
  }

  verifyOrder(orderId, transactionId, usedPoints, usedBalance) {

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId) ||
      !transactionId || !mongoose.Types.ObjectId.isValid(transactionId)
    )
      return Promise.reject(error.invalidId);


    let warehouses;
    return new WarehouseModel(Order.test).getAllWarehouses()
      .then(res => {
        warehouses = res;

        return this.OrderModel.findOneAndUpdate({
            _id: mongoose.Types.ObjectId(orderId)
          }, {
            'transaction_id': transactionId,
            'used_point': usedPoints,
            'used_balance': usedBalance,
            'is_cart': false
          },
          {new: true}).lean()
          .then(res => {

            if (!res)
              return Promise.reject(error.orderNotFound);

            let promises = [];

            if (!res.is_collect) {
              res.order_lines.forEach(x => {
                promises.push(this.ORP(res, x, warehouses))
              });
            }
            else {
              res.order_lines.forEach(x => {
                promises.push(this.processCC(res, x, warehouses))
              });
            }
            return Promise.all(promises)
          });


      })
  }

  processCC(order, order_line, warehouses) {
    let CCWarehouse = warehouses.find(x => x.address._id.toString() === order.address._id.toString());

    return new ProductModel(Order.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);


        let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === CCWarehouse._id.toString() && (x.count - x.reserved > 0));
        if (foundInventory) {
          return this.setNewTicket(order, order_line, CCWarehouse, _const.ORDER_STATUS.Invoice);
        }
        else {
          return this.ORP(order, order_line, warehouses, CCWarehouse._id)
        }
      });


  }

  ORP(order, order_line, warehouses, exceptionId = null) {

    if(exceptionId.toString() === warehouses.find(x => x.is_center)._id.toString())
      return Promise.reject(error.centralWarehouseORPFailed);

    let filteredWarehouses = warehouses.filter(x => x._id.toString() !== exceptionId.toString()).slice();
    return new ProductModel(Order.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);


        for (let i = 0; i < filteredWarehouses.length; i++) {
          let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === filteredWarehouses[i]._id.toString() && (x.count - x.reserved > 0));
          if (foundInventory) {
            return this.setNewTicket(order, order_line, filteredWarehouses[i], _const.ORDER_STATUS.SCSentToCentral);
          }
        }
        return this.setNewTicket(order, order_line, filteredWarehouses.find(x => x.is_center), _const.ORDER_STATUS.default);
      });

  }

  setNewTicket(order, order_line, warehouse, status) {


    if (order_line.tickets.find(x => !x.is_processed && x.status === status))
      return Promise.reject(error.existingActiveTicket);


    return this.OrderModel.update({
      '_id': order._id,
      'order_lines._id': order_line._id
    }, {
      $set: {
        'order_lines.$.tickets': [{
          'warehouse_id': warehouse._id,
          'status': status,
          'is_processed': false
        }]
      }

    });
  }

  /**
   * this api is called by offline system.
   * @param body => orderId, orderLineId, userId, warehouseId
   * @returns {*}
   */

  /**
   * @param body
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to remove
   * @returns {Promise.<*>}
   */
  removeFromOrder(user, body) {
    if (!user)
      return Promise.reject(error.noUser);
    if (!body)
      return Promise.reject(error.bodyRequired);

    let piid = body.product_instance_id;
    let n = body.number || -1;

    if (!mongoose.Types.ObjectId.isValid(piid))
      return Promise.reject(error.invalidId);

    if (n === -1 || n === null) {
      return this.OrderModel.update({
        customer_id: user.id,
        is_cart: true
      }, {
        $pull: {
          'order_lines': {
            product_instance_id: piid
          }
        }
      }, {
        multi: true
      });
    }
    else {

      return this.OrderModel.aggregate([
        {
          $match: {customer_id: mongoose.Types.ObjectId(user.id), is_cart: true}
        },
        {
          $unwind: {
            path: '$order_lines',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {'order_lines.product_instance_id': mongoose.Types.ObjectId(piid)}
        },
        {
          $limit: n
        }
      ])
        .then(res => {
          let ids = res.map(x => x.order_lines._id);
          return this.OrderModel.update({
            customer_id: user.id,
            is_cart: true,
          }, {
            $pull: {
              'order_lines': {
                _id: {$in: ids}
              }
            }
          })
        });
    }
  }

  getOrders(user) {
    if (!user)
      return Promise.reject(error.noUser);
    return this.OrderModel.aggregate(
      [
        {
          $match: {
            $and: [
              {customer_id: mongoose.Types.ObjectId(user.id)},
              {is_cart: false},
              {transaction_id: {$ne: null}},
              {address: {$ne: null}},
            ]
          }
        },
        {
          $unwind: {
            path: '$order_lines',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'product',
            localField: 'order_lines.product_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$product.instances', // it makes product.instances, single element array for each instance
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: '$_id',
            transaction_id: '$transaction_id',
            address: '$address',
            total_amount: '$total_amount',
            is_collect: '$is_collect',
            coupon_code: '$coupon_code',
            used_point: '$used_point',
            used_balance: '$used_balance',
            order_time: '$order_time',
            order_lines: {
              order_line_id: '$order_lines._id',
              paid_price: '$order_lines.paid_price',
              adding_time: '$order_lines.adding_time',
              tickets: '$order_lines.tickets',
              product_instance: {
                '_id': '$product.instances._id',
                'barcode': '$product.instances.barcode',
                'size': '$product.instances.size',
                'product_color_id': '$product.instances.product_color_id'
              },
              product: {
                '_id': "$product._id",
                'date': "$product.date",
                'colors': "$product.colors",
                'reviews': "$product.reviews",
                "instances": "$product.instances",
                "campaigns": "$product.campaigns",
                "name": "$product.name",
                "product_type": "$product.product_type",
                "brand": "$product.brand",
                "base_price": "$product.base_price",
                "desc": "$product.desc",
                "__v": "$product.__v"
              }
            },
            cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
          },
        },
        {
          $match: {
            cmp_value: {$eq: 0}
          }
        },
        {
          $sort: {
            'adding_time':
              1,
          }
        },
        {
          $group: {
            _id: '$_id',
            "address": {"$first": "$address"},
            "transaction_id": {"$first": "$transaction_id"},
            "used_balance": {"$first": "$used_balance"},
            "total_amount": {"$first": "$total_amount"},
            "is_collect": {"$first": "$is_collect"},
            "coupon_code": {"$first": "$coupon_code"},
            "used_point": {"$first": "$used_point"},
            "order_time": {"$first": "$order_time"},
            order_lines: {$push: "$order_lines"}
          }
        },
      ]).then(res => {
      return Promise.resolve({
        orders: res
      }).catch(e => {
        console.log(e);
      });

    });
  }

  getCartItems(user, body) {
    if (!user && (!body || !body.data))
      return Promise.reject(error.instanceDataRequired);

    let overallDetails = null;

    return new Promise((resolve, reject) => {
      // Check user is logged in or not
      // If user is logged in get instance_ids of order-line
      if (user) {
        this.getCustomerOrderDetails(user.id)
          .then(res => {
            overallDetails = res;
            return (new ProductModel(Order.test)).getProducts(Array.from(new Set(res.map(el => mongoose.Types.ObjectId(el.product_id)))), null, null);
          })
          .then(res => {
            if (!res || res.length <= 0)
              overallDetails = [];

            overallDetails.forEach(el => {
              el.instance_id = el._id;
              const tempCurrentProduct = res.find(i => i._id.equals(el.product_id));
              let instances = [];

              if (tempCurrentProduct) {
                const tempCurrentInstance = tempCurrentProduct.instances
                  .find(i => i._id.equals(el.instance_id));

                const colorId = tempCurrentInstance.product_color_id;

                el.discount = tempCurrentProduct.discount;
                el.name = tempCurrentProduct.name;
                el.base_price = tempCurrentProduct.base_price;
                el.size = tempCurrentInstance.size;
                el.instance_price = tempCurrentInstance.price;
                el.tags = tempCurrentProduct.tags;
                el.count = tempCurrentInstance.inventory.length > 0 ?
                  (tempCurrentInstance.inventory.map(i => i.count).reduce((a, b) => a + b) - tempCurrentInstance.inventory.map(i => i.reserved).reduce((a, b) => a + b))
                  : 0;

                const tempColorImage = tempCurrentProduct.colors.find(i => i._id && i._id.equals(colorId));
                el.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                el.color = tempColorImage ? {
                  id: tempColorImage._id,
                  color_id: tempColorImage.color_id,
                  name: tempColorImage.name,
                } : {};

                tempCurrentProduct.instances.forEach(item => {
                  if (item.product_color_id.equals(colorId))
                    instances.push({
                      instance_id: item._id,
                      size: item.size,
                      price: item.price,
                      quantity: item.inventory.length > 0 ?
                        (item.inventory.map(i => i.count).reduce((a, b) => a + b) - item.inventory.map(i => i.reserved).reduce((a, b) => a + b))
                        : 0,
                    });
                });
              }

              el.instances = instances;
            });

            resolve(overallDetails);
          })
          .catch(err => {
            console.error('An error occurred in getCartItems function (user is logged in): ', err);
            reject(err);
          });
      } else {
        (new ProductModel(Order.test)).getProducts(Array.from(new Set(body.data.map(el => mongoose.Types.ObjectId(el.product_id)))), null, null)
          .then(res => {
            let resultData = [];

            //Remove duplicate data
            let data = [];
            body.data.forEach(el => {
              const temp = data.find(i => {
                if (i &&
                  i.product_id && el.product_id && i.product_id.toString() === el.product_id.toString()
                  && i.instance_id && el.instance_id && i.instance_id.toString() === el.instance_id.toString())
                  return true;
              });
              if (!temp)
                data.push(el);
            });

            data.forEach(el => {
              let objData = {};

              // Details of product and related instances
              const tempProductData = res.find(i => i._id.equals(el.product_id));
              let instances = [];

              if (tempProductData) {
                const tempProductInstanceData = tempProductData.instances.find(i => i._id.equals(el.instance_id));
                const colorId = tempProductInstanceData.product_color_id;

                objData.discount = tempProductData.discount;
                objData.product_id = el.product_id;
                objData.instance_id = el.instance_id;
                objData.name = tempProductData.name;
                objData.base_price = tempProductData.base_price;
                objData.size = tempProductInstanceData.size;
                objData.instance_price = tempProductInstanceData.price;
                objData.tags = tempProductData.tags;
                objData.count = tempProductInstanceData.inventory.length > 0 ?
                  tempProductInstanceData.inventory.map(i => i.count - (i.reserved ? i.reserved : 0)).reduce((a, b) => a + b)
                  : 0;
                const tempColorImage = tempProductData.colors.find(i => i._id && i._id.equals(colorId));
                objData.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                objData.color = tempColorImage ? {
                  id: tempColorImage._id,
                  color_id: tempColorImage.color_id,
                  name: tempColorImage.name
                } : {};

                tempProductData.instances.forEach(item => {
                  if (item.product_color_id.equals(colorId))
                    instances.push({
                      instance_id: item._id,
                      size: item.size,
                      price: item.price,
                      quantity: item.inventory.length > 0 ?
                        (item.inventory.map(i => i.count).reduce((a, b) => a + b) - item.inventory.map(i => i.reserved).reduce((a, b) => a + b))
                        : 0,
                    });
                });

                objData.instances = instances;
                objData.quantity = el.quantity || 1;
              }

              resultData.push(objData);
            });

            resolve(resultData);
          })
          .catch(err => {
            console.error('An error occurred in getCartItems function (user is not logged in): ', err);
            reject(err);
          });
      }
    });
  }

  getCustomerOrderDetails(user_id) {
    return this.OrderModel.aggregate([
      {
        $match: {customer_id: mongoose.Types.ObjectId(user_id), 'address._id': {$exists: false}, is_cart: true}
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$order_lines.product_instance_id',
          order_id: {$first: '$_id'},
          product_id: {$first: '$order_lines.product_id'},
          quantity: {$sum: 1},
          transaction_id: {$first: '$transaction_id'}
        }
      }
    ])
  }

  checkCouponValidation(user, body) {
    if (!user)
      return Promise.reject(error.noUser);

    if (!body.product_ids || body.product_ids.length <= 0)
      return Promise.reject(error.productIdRequired);

    if (!body.coupon_code)
      return Promise.reject(error.noCouponCode);

    return new Promise((resolve, reject) => {
      this.getCustomerOrderDetails(user.id)
        .then(res => {
          res = res.filter(el => body.product_ids.includes(el.product_id.toString()) && !el.transaction_id);

          if (res.length > 0)
            return (new ProductModel(Order.test)).getProductCoupon(res.map(el => mongoose.Types.ObjectId(el.product_id)), body.coupon_code);
          else
            return Promise.reject(error.invalidExpiredCouponCode);
        })
        .then(res => {
          if (!res || res.length <= 0)
            return Promise.reject(error.invalidExpiredCouponCode);

          resolve(res);
        })
        .catch(err => {
          console.error('An error occurred in checkCouponValidation function: ', err);
          reject(err);
        })
    });
  }

  applyCouponCode(user, body) {
    if (!user)
      return Promise.reject(error.noUser);

    if (!body.coupon_code || body.coupon_code.length <= 0)
      return Promise.reject(error.noCouponCode);

    return this.OrderModel.update({
      customer_id: mongoose.Types.ObjectId(user.id),
      transaction_id: {$exists: false},
      is_cart: true
    }, {
      coupon_code: body.coupon_code,
    }, {
      upsert: true
    });
  }


  setTicket(type, body, user) {

    return this.checkCurrentStatus(type, body)
      .then(res => {
        if (res.isActive) {
          return Promise.reject(error.existingActiveTicket);
        }
        if (typeof this[type] === 'function') {
          // some tickets such as invoice needs to be refreshed (to send new request to offline system)
          return this[type](body, res.order, user);
        }
      });
  }

  checkCurrentStatus(type, body) {
    if (!body.orderId || !body.orderLineId)
      return Promise.reject(error.orderLineNotFound);

    if (!mongoose.Types.ObjectId.isValid(body.orderId) || !mongoose.Types.ObjectId.isValid(body.orderLineId))
      return Promise.reject(error.invalidId);

    return this.OrderModel.findById(mongoose.Types.ObjectId(body.orderId)).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.orderNotFound);

        const foundOrderLine = res.order_lines.find(x => x._id.toString() === body.orderLineId);
        let status = 0;
        switch (type) {
          case 'refer':
            status = _const.ORDER_STATUS.SMAssignToWarehouse;
            break;
          case 'invoice':
            status = _const.ORDER_STATUS.Invoice;
            break;
          case 'refund':
            status = _const.ORDER_STATUS.SMRefund;
            break;
          case 'verifyInvoice':
            status = _const.ORDER_STATUS.ReadyToDeliver;
            break;
        }
        return Promise.resolve({
          order: res,
          isActive: (status > 0 && foundOrderLine.tickets.find(x => !x.is_processed && x.status === status))
        })

      });


  }

  closeCurrentTicket(query, orderLineId, userId) {

    return this.OrderModel.update(query, {
      '$set': {
        'order_lines.$[i].tickets.$[j].is_processed': true,
        'order_lines.$[i].tickets.$[j].agent_id': userId,
      }
    }, {
      arrayFilters: [
        {'i._id': mongoose.Types.ObjectId(orderLineId)},
        {'j.is_processed': false}
      ]
    })

  }

  refer(body, order, user) {

    if (user.access_level !== _const.ACCESS_LEVEL.SalesManager)
      return Promise.reject(error.noAccess);

    if (!body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId))
      return Promise.reject(error.warehouseIdRequired);

    let query = {
      '_id': mongoose.Types.ObjectId(body.orderId),
    };
    if (body.referralAdvice) {
      query.is_collect = false;
    }

    let warehouses;

    return new WarehouseModel(Order.test).getWarehouses()
      .then(res => {
        warehouses = res;
        return this.closeCurrentTicket(query, body.orderLineId, user.id)
      })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          query['order_lines._id'] = mongoose.Types.ObjectId(body.orderLineId);
          let newTicketUpdate = {
            '$addToSet': {
              'order_lines.$.tickets': {
                'warehouse_id': order.is_collect ?
                  warehouses.find(x => x.address._id.toString() === order.address._id.toString())._id
                  : mongoose.Types.ObjectId(body.warehouseId),
                'status': _const.ORDER_STATUS.SMAssignToWarehouse,
                'desc': body.desc ? body.desc : ''
              }
            }
          };
          if (body.referralAdvice) {
            newTicketUpdate.$addToSet['order_lines.$.tickets'].referral_advice = body.referralAdvice;
          }

          return this.OrderModel.update(query, newTicketUpdate);
        }
        else {
          return Promise.reject(error.activeTicketNotFound);
        }
      })

  }

  refund(body, order, user) {

    if (user.access_level !== _const.ACCESS_LEVEL.SalesManager)
      return Promise.reject(error.noAccess);

    let query = {
      '_id': mongoose.Types.ObjectId(body.orderId),
    };

    return this.closeCurrentTicket(query, body.orderLineId, user.id)
      .then(res => {

        if (res && res.n === 1 && res.nModified === 1) {
          query['order_lines._id'] = mongoose.Types.ObjectId(body.orderLineId);
          let newTicketUpdate = {
            '$addToSet': {
              'order_lines.$.tickets': {
                'status': _const.ORDER_STATUS.SMRefund,
                'desc': body.desc ? body.desc : ''
              }
            }
          };

          return this.OrderModel.update(query, newTicketUpdate);
        }
        else {
          return Promise.reject(error.activeTicketNotFound);
        }
      })

  }

  invoice(body, order, user) {

    if (user.access_level !== _const.ACCESS_LEVEL.SalesManager && user.access_level !== _const.ACCESS_LEVEL.ShopClerk)
      return Promise.reject(error.noAccess);

    if (order.is_collect && user.access_level === _const.ACCESS_LEVEL.SalesManager)
      return Promise.reject(error.noAccess);

    let query = {
      '_id': mongoose.Types.ObjectId(body.orderId),
    };

    let result;

    return this.closeCurrentTicket(query, body.orderLineId, user.id)
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          query['order_lines._id'] = mongoose.Types.ObjectId(body.orderLineId);
          let newTicketUpdate = {
            '$addToSet': {
              'order_lines.$.tickets': {
                'warehouse_id': mongoose.Types.ObjectId(user.warehouse_id),
                'status': _const.ORDER_STATUS.Invoice,
                'desc': body.desc ? body.desc : ''
              }
            }
          };

          return this.OrderModel.update(query, newTicketUpdate)

        } else {
          return Promise.reject(error.activeTicketNotFound);
        }

      })
      .then(res => {
        result = res;
        return this.offlineInvoice(order, body.orderLineId, user.warehouse_id, user.id)
      })
      .then(res => {
        return Promise.resolve(result);
      })

  }

  resendInvoiceRequest(body, user) {

    return this.checkCurrentStatus('invoice', body)
      .then(res => {

        if (!res.isActive)
          return Promise.reject(error.preInvoiceTicketIsNotExists);

        return this.offlineInvoice(res.order, body.orderLineId, user.warehouse_id, user.id);
      }).then(res => Promise.resolve({result: 'ok'}))


  }

  offlineInvoice(order, orderLineId, warehouseId, userId) {

    if (Order.test)
      return Promise.resolve();

    let foundOrderLine = order.order_lines.find(x => x._id.toString() === orderLineId);
    let productId = foundOrderLine.product_id;
    let productInstanceId = foundOrderLine.product_instance_id;

    let customer, productInstance;

    return new ProductModel(Order.test).getInstance(productId.toString(), productInstanceId.toString())
      .then(res => {
        if (!res || !res.barcode)
          return Promise.reject(error.productInstanceNotExist);

        productInstance = res;
        return new CustomerModel(Order.test).getById(order.customer_id);
      })
      .then(res => {
        customer = res;
        if (!customer || !customer.mobile_no)
          return Promise.reject(error.noUsernameMobileNo);

        return helpers.httpPost(env.offlineURL, {
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

  /**
   * this function is not called by setTicket function and is used by offline system
   * @param body
   * @returns {Promise.<*>}
   */
  verifyInvoice(body) {

    let query;
    let order;
    return this.checkCurrentStatus('verifyInvoice', body)
      .then(res => {

        if (res.isActive)
          return Promise.reject(error.existingActiveTicket);

        order = res.order;

        if (!body.warehouseId || !mongoose.Types.ObjectId.isValid(body.warehouseId) ||
          !body.userId || !mongoose.Types.ObjectId.isValid(body.userId) ||
          !body.mobileNo || !body.point || !body.balance) {
          return Promise.reject(error.invalidId);
        }
        query = {
          '_id': mongoose.Types.ObjectId(body.orderId),
        };

        return this.closeCurrentTicket(query, body.orderLineId, body.userId)
      })
      .then(res => {

        if (res && res.n === 1 && res.nModified === 1) {
          query['order_lines._id'] = mongoose.Types.ObjectId(body.orderLineId);
          let newTicketUpdate = {
            '$addToSet': {
              'order_lines.$.tickets': {
                'warehouse_id': mongoose.Types.ObjectId(body.warehouseId),
                'status': _const.ORDER_STATUS.ReadyToDeliver,
              }
            }
          };
          return this.OrderModel.update(query, newTicketUpdate);
        }
        else {
          return Promise.reject(error.activeTicketNotFound);
        }
      })
      .then(res => {
        return new CustomerModel(Order.test).updateByOfflineSystem(body.mobileNo, body.point, body.balance)
      })
      .then(res => {

        return new ProductModel(Order.test).setInventory({
          id: order.order_lines.find(x => x._id.toString() === body.orderLineId).product_id.toString(),
          productInstanceId: order.order_lines.find(x => x._id.toString() === body.orderLineId).product_instance_id.toString(),
          count: -1,
          warehouseId: body.warehouseId,
        });

      })
      .then(res => {
        if (!Order.test)
          socket.sendToNS(body.warehouseId, {
            type: _const.ORDER_STATUS.ReadyToDeliver,
            data: {
              orderId: body.orderId,
              orderLineId: body.orderLineId
            }
          });

        return Promise.resolve();

      })

  }


  search(options, offset, limit, user) {

    if (!user.warehouse_id)
      return Promise.reject(error.agentWarehouseIdRequired);


    let pre = [
      {
        $match: {
          $and: [
            {is_cart: false},
            {transaction_id: {$ne: null}},
          ]
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
        $unwind: {
          path: '$customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'product',
          localField: 'order_lines.product_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$product.instances', // it makes product.instances, single element array for each instance
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          customer: {
            '_id': '$customer._id',
            'name': '$customer.first_name',
            'surname': '$customer.surname',
            'addresses': '$customer.addresses'
          },
          transaction_id: 1,
          total_amount: 1,
          used_point: 1,
          used_balance: 1,
          is_collect: 1,
          order_line_id: '$order_lines._id',
          paid_price: '$order_lines.paid_price',
          adding_time: '$order_lines.adding_time',
          warehouse_id: '$order_lines.warehouse_id',
          tickets: '$order_lines.tickets',
          product_id: '$product._id',
          product_name: '$product.name',
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          address: 1,
          cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
        }
      }
    ];

    let post = [
      {
        $sort: {
          'adding_time': 1,
        }
      },
      {
        $skip: Number.parseInt(offset)
      },
      {
        $limit: Number.parseInt(limit)
      }
    ];

    let search;

    if (options && options.output) {
      search = this.searchOutbox(user.warehouse_id);
    } else {
      search = this.searchInbox(user.warehouse_id);
    }


    let result;

    return this.OrderModel.aggregate(pre.concat(search, post)).then(res => {
      result = res;
      pre = [
        {
          $match: {
            $and: [
              {is_cart: false},
              {transaction_id: {$ne: null}},
            ]
          }
        },
        {
          $unwind: {
            path: '$order_lines',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $lookup: {
            from: 'product',
            localField: 'order_lines.product_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: {
            path: '$product',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$product.instances', // it makes product.instances, single element array for each instance
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            tickets: '$order_lines.tickets',
            cmp_value: {$cmp: ['$order_lines.product_instance_id', '$product.instances._id']}
          }
        },
      ];
      post = [
        {
          $count: 'count'
        }
      ];

      return this.OrderModel.aggregate(pre.concat(search, post))

    })
      .then(res => {
        let totalCount = res[0] ? res[0].count : 0;
        return Promise.resolve({
          data: result,
          total: totalCount,
        });
      });
  }

  searchInbox(warehouseId) {
    return [
      {
        $match: {
          cmp_value: {$eq: 0}
        }
      },
      {
        $unwind: {
          path: '$tickets',
          preserveNullAndEmptyArrays:
            true
        }
      },
      {
        $match: {
          $and: [
            {'tickets.warehouse_id': mongoose.Types.ObjectId(warehouseId)},
            {'tickets.is_processed': false},
            {
              'tickets.status': {
                $nin: [
                  _const.ORDER_STATUS.ReadyToDeliver
                ]
              }
            }
          ]
        }
      },
    ]
  }

  searchOutbox(warehouseId) {
    return [
      {
        $match: {
          cmp_value: {$eq: 0},
          $and: [{'tickets.warehouse_id': mongoose.Types.ObjectId(warehouseId)}, {'tickets.is_processed': true}]
        }
      },
      {
        $unwind: {
          path: '$tickets',
          preserveNullAndEmptyArrays:
            true
        }
      },
      {
        $match: {
          'tickets.is_processed': false
        }
      },
    ]
  }

  checkoutCart(user, body) {

  }

  getIPGToken(user, orderId, price) {
    return soap.createClient(IPG_URL)
      .then(client => {
        return client.RequestToken(IPG_MID, orderId, price * 10);
      })
  }
}

Order
  .test = false;

module
  .exports = Order;

