const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const soap = require('soap-as-promised');
const IPG_URL = 'https://sep.shaparak.ir/payments/initpayment.asmx';
const IPG_MID = '123';
const CustomerModel = require('./customer.model');
const OfflineModel = require('./offline.model');
const _const = require('./const.list');
const DSSModel = require('./dss.model');

const inventoryCount = function (instance) {
  const inventory = instance.inventory;
  return inventory && inventory.length ? inventory.map(i => i.count - (i.reserved ? i.reserved : 0)).reduce((a, b) => a + b) : 0;
};

class Order extends Base {

  constructor(test = Order.test) {
    super('Order', test);
    this.OrderModel = this.model;
  }

  /**
   * @param items
   *  product_id: the id of the product
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to add
   * @returns {Promise.<*>}
   */
  addToOrder(user, items, updateQuery = {}, guest = false) {
    if (!user || user.access_level !== undefined)
      return Promise.reject(error.noUser);
    if (!items || (items.length !== undefined && !items.length))
      return Promise.reject(error.bodyRequired);

    if (!items.length)
      items = [items];
    let newOrderLines = [];

    for (let item of items) {
      let pid = item.product_id;
      let piid = item.product_instance_id;
      let n = item.number || 1;

      if (!mongoose.Types.ObjectId.isValid(piid) || !mongoose.Types.ObjectId.isValid(pid))
        return Promise.reject(error.invalidId);
      for (let i = 0; i < n; i++) {
        newOrderLines.push({
          product_id: pid,
          product_instance_id: piid
        });
      }
    }
    const query = Object.assign({
      customer_id: user.id,
      is_cart: true,
      transaction_id: null
    }, updateQuery);

    return this.OrderModel.findOneAndUpdate(
      query, {
        $addToSet: {
          'order_lines': {
            $each: newOrderLines
          }
        }
      }, {
        upsert: true,
        new: true
      })
  }

  finalCheck(cartItems) {
    return Promise.all(cartItems
      .map(initialValues => new ProductModel(Order.test).getProduct(initialValues.product_id.toString())
        .then(product => Object.assign(product, {initialValues}))))
      .then(arr => {
        arr.forEach((r, i) => {

          const foundInstance = r.instances.find(x => x._id.toString() === r.initialValues.product_instance_id);
          r.errors = [];
          r.warnings = [];

          r.count = inventoryCount(foundInstance);
          if (r.initialValues.quantity > r.count) {
            r.errors.push('soldOut');
          }

          r.price = foundInstance.price ? foundInstance.price : r.base_price;
          if (r.price !== r.initialValues.price) {
            r.warnings.push('priceChanged');
          }

          if (r.discount !== r.initialValues.discount) {
            r.warnings.push('discountChanged');
          }

        })
        return Promise.resolve(arr);
      });
  }

  checkoutCart(user, cartItems, orderId, address, customerData, transaction_id, used_point, used_balance, total_amount, is_collect, discount) {
    const is_cart = false;

    if (!transaction_id || !address)
      return Promise.reject(error.orderVerficationFailed);

    const values = {
      transaction_id,
      used_point,
      used_balance,
      address,
      is_cart,
      is_collect,
      total_amount,
      discount,
      order_time: new Date(),
    };

    const dssModel = new DSSModel(Order.test);

    if (user && user.access_level === undefined) {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId) ||
        !transaction_id
      )
        return Promise.reject(error.invalidId);

      return this.OrderModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(orderId)
      }, values,
        {new: true}).lean()
        .then(res => dssModel.startProcess(res))
    } else {
      if (!cartItems || !cartItems.length)
        return Promise.reject('Cart is empty!');

      const guestUser = {username: customerData.recipient_email};
      for (const key in customerData) {
        guestUser[key.replace('recipient_', '')] = customerData[key];
      }
      guestUser.first_name = guestUser.name;
      if (address.city)
        guestUser.addresses = [address];
      let user = {};
      return new CustomerModel(Order.test).addGuestCustomer(guestUser)
        .then(u => {
          u.id = u._id;
          user = u;
          return this.addToOrder(user, cartItems, values);
        })
        .then(res => dssModel.startProcess(res))
    }
  }

 /**
   * @param body
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to remove
   * @returns {Promise.<*>}
   */
  removeFromOrder(user, body) {
    if (!user || user.access_level !== undefined)
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
    if (!user || user.access_level !== undefined)
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
            discount: '$discount',
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
                "tags": "$product.tags",
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
            "discount": {"$first": "$discount"},
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
  getCartItems(user) {
    if (!user || user.access_level !== undefined)
      return Promise.reject(error.instanceDataRequired);

    return this.OrderModel.aggregate([
      {
        $match: {customer_id: mongoose.Types.ObjectId(user.id), 'address._id': {$exists: false}, is_cart: true}
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
        }
      }
    ])

  }

  checkCouponValidation(user, body) {
    if (!user || user.access_level !== undefined)
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
            return this.OrderModel.find({coupon_code: body.coupon_code, customer_id: user.id});
          else
            return Promise.reject(error.invalidExpiredCouponCode);


          // if (res.length > 0)
          //   return (new ProductModel(Order.test)).getProductCoupon(res.map(el => mongoose.Types.ObjectId(el.product_id)), body.coupon_code);
          // else
          //   return Promise.reject(error.invalidExpiredCouponCode);
        })
        .then(res => {
          if (res.length)
            return Promise.reject(error.invalidExpiredCouponCode);
          return models['Campaign' + (Order.test ? 'Test' : '')].find({'coupon_code': body.coupon_code});
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
    if (!user || user.access_level !== undefined)
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

  getIPGToken(user, orderId, price) {
    return soap.createClient(IPG_URL)
      .then(client => {
        return client.RequestToken(IPG_MID, orderId, price * 10);
      })
  }

  getTickets(params, body, user) {

    if (!mongoose.Types.ObjectId.isValid(params.orderId) || !mongoose.Types.ObjectId.isValid(params.orderLineId)) {
      return Promise.reject(error.invalidId);
    }
    return this.OrderModel.aggregate([{
        $match: {
          '_id': mongoose.Types.ObjectId(params.orderId)
        }
      },
      {
        $project: {
          order_line: {
            $filter: {
              input: "$order_lines",
              as: "order_line",
              cond: {
                $eq: ["$$order_line._id", mongoose.Types.ObjectId(params.orderLineId)]
              }
            },
          },
        }
      },
      {
        $unwind: '$order_line'
      },
      {
        $unwind: '$order_line.tickets'
      },
      {
        $lookup: {
          from: "agent",
          localField: "order_line.tickets.agent_id",
          foreignField: "_id",
          as: "agent"
        }
      },
      {
        $lookup: {
          from: "warehouse",
          localField: "order_line.tickets.receiver_id",
          foreignField: "_id",
          as: "receiver_warehouse"
        }
      },
      {
        $lookup: {
          from: "agent",
          localField: "order_line.tickets.receiver_id",
          foreignField: "_id",
          as: "receiver_agent"
        }
      },
      
      {
        $group: {
          _id: '$_id',
          tickets: {
            $push: {
              is_processed: '$order_line.tickets.is_processed',
              receiver_warehouse: "$receiver_warehouse",
              receiver_agent: "$receiver_agent",
              desc: "$order_line.tickets.desc",
              timestamp: "$order_line.tickets.timestamp",
              status: "$order_line.tickets.status"

            }
          }

        }
      }
    ]);
    // return this.OrderModel.findOne({
    //   "order_lines._id": mongoose.Types.ObjectId(params.orderLineId), 
    // },{"order_lines.$": mongoose.Types.ObjectId(params.orderLineId)})
    // .populate({path: 'order_lines.tickets.receiver_id'})
    // .populate({path: 'order_lines.tickets.agent_id'}).then(res => {
    //   console.log(JSON.stringify(res, null, 2));
      
    // });
    
  }
}
Order.test = false;
module.exports = Order;

