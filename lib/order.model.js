const Base = require('./base.model');
const env = require('../env');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const LoyaltyGroupModel = require('./loyalty_group.model');
const DeliveryDurationInfoModel = require('./delivery_duration_info.model')
const OfflineModel = require('./offline.model');
const _const = require('./const.list');
const DSSModel = require('./dss.model');
const moment = require('moment');
const rp = require('request-promise');

const soap = require('soap-as-promised');
const IPG_URL = 'https://sep.shaparak.ir/payments/initpayment.asmx';
const IPG_MID = '123';
const sha1 = require('sha1');
const RSAXML = require('rsa-xml');
const nodersa = require('node-rsa');

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
      customer_id: user.id ? user.id : null,
      // shop_name: user.name,
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

  sendDataToBank(user, data) {
    let redirectAddress = "http://merchantsite.com/redirectAddress.aspx";
    let time = moment().format("YYYY/MM/DD HH:mm:ss");
    let timeStamp = time;
    let invoiceNumber = 12312322222;
    let invoiceDate = time;
    let privateKey = env.private_key;
    let action = "1003";

    let mobile = '';
    let email = '';

    if(user && user.access_level === undefined) {
      mobile = user.mobile_no;
      email = user.username;
    } else {
      email = data.address.recipient_email;
      mobile = data.address.recipient_mobile_no;
    }
    data.total_amount = 1000;
    let dataToSign = "#" + env.merchant_code + "#" + env.terminal_code  + "#" + invoiceNumber + "#" + invoiceDate + "#" + data.total_amount + "#" + redirectAddress + "#" + action + "#"
      + timeStamp + "#";
    let hashDataToSign = sha1(dataToSign);

    const pemKey = new RSAXML().exportPemKey(privateKey);

    const signKey = new nodersa(pemKey);

    const signedString = signKey.sign(hashDataToSign);

    let buff = new Buffer.from(signedString);
    let finalSign = buff.toString('base64');
    console.log(time);
    console.log(finalSign);

    return Promise.resolve({
      invoiceNumber: invoiceNumber,
      invoiceDate: invoiceDate,
      amount: data.total_amount,
      terminalCode: env.terminal_code,
      merchantCode: env.merchant_code,
      redirectAddress: redirectAddress,
      timeStamp: timeStamp,
      action: action,
      sign: finalSign,
    });
  }

  checkoutCart(user, cartItems, orderId, address,
               transaction_id, used_point, used_balance, total_amount, is_collect, discount, duration_days, time_slot, paymentType, recievedLoyalty) {

    if (is_collect) {
      duration_days = null;
      time_slot = null;
    }

    const is_cart = false;
    const dssModel = new DSSModel(Order.test);
    let tempRes;
    let total_loyalty_point;
    let loyalty = {
      delivery_spent: 0,
      shop_spent: 0,
      delivery_value: 0,
      shop_value: 0,
      earn_point: 0,
    };

    if (!transaction_id || !address)
      return Promise.reject(error.orderVerificationFailed);

    if (!is_collect && (!duration_days || !time_slot || (!paymentType && paymentType !== 0))) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    const values = {
      transaction_id,
      used_point,
      used_balance,
      address,
      is_cart,
      is_collect,
      total_amount,
      discount,
      duration_days,
      time_slot,
      order_time: moment()
    };

    if (!is_collect)
      values.order_time.isAfter(_const.EXPIRE_ADD_ORDER_TIME) ?
        values.delivery_expire_day = moment().add(duration_days + 1, 'days') : values.delivery_expire_day = moment().add(duration_days, 'days');

    if (user && user.access_level === undefined) {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId) ||
        !transaction_id
      )
        return Promise.reject(error.invalidId);


      return this.earnSpentPoint(user, paymentType, total_amount, is_collect, duration_days, recievedLoyalty, discount)
        .then(res => {
          total_loyalty_point = res.final_point;
          loyalty.earn_point = res.earn_point;
          loyalty.delivery_spent = res.delivery_spent ? res.delivery_spent : 0;
          loyalty.shop_spent = res.shop_spent ? res.shop_spent : 0;
          loyalty.delivery_value = res.delivery_value ? res.delivery_value : 0;
          loyalty.shop_value = res.shop_value ? res.shop_value : 0;
          values.loyalty = loyalty;
          return this.OrderModel.findOneAndUpdate({
              _id: mongoose.Types.ObjectId(orderId)
            }, {
              $set: values
            },
            {new: true}).lean()
        })
        .then(res => {
          tempRes = res;
          return models()['Customer' + (Order.test ? 'Test' : '')].findOneAndUpdate({
              _id: mongoose.Types.ObjectId(tempRes.customer_id),
              is_guest: false,
            },
            {$set: {loyalty_points: total_loyalty_point}}
          )
        })
        .then(res => {
          return dssModel.startProcess(tempRes);
        })
    } else {
      if (!cartItems || !cartItems.length)
        return Promise.reject('Cart is empty!');

      const guestUser = address;
      address.recipient_email = address.recipient_email;

      if (address.city)
        guestUser.addresses = [address];

      return this.addToOrder(address, cartItems, values)
        .then(res => {
          dssModel.startProcess(res);
          return Promise.resolve(res);
        })
    }
  }


  earnSpentPoint(user, paymentType, total_amount, is_collect, duration_days, recievedLoyalty, discount) {
    let earn_point = 0;
    let system_offline_offer = 25000;  // in every 25000 tooman shop, user earns 1 score
    let shop_value_offer = 400;
    let valid_loyaltyGroups;
    let user_point = 0;
    let scoreArray;
    let maxScore;
    let customer_loyaltyGroup;
    let duration_info;
    let duration_loyalty_info;
    let loyalty_group_price;
    let deliveryCostInDuration;
    let used_delivery_loyalty_point;
    let remain_point;
    let shop_cost;
    let used_shop_point;

    return new CustomerModel().getById(user.id)
      .then(res => {
        if (!res || res.is_guest)
          return Promise.resolve({
            'earn_point': 0,
            'final_point': 0,
          });

        user_point = res.loyalty_points;
        earn_point = Math.floor(total_amount / system_offline_offer);

        if (paymentType === 2) { // user does not earn any point when uses his/her loyalty points eather in C&C or not

          if (is_collect) {
            let user_point_price = user_point * shop_value_offer;


            if (user_point_price > total_amount) {
              console.log('User Point Price : ', user_point_price);
              return Promise.resolve({
                'earn_point': 0,
                'final_point': user_point - Math.floor(total_amount / shop_value_offer),
                'shop_spent': Math.floor(total_amount / shop_value_offer),
                'shop_value': total_amount,
              })
            }
            else {
              console.log('user point price : ', user_point_price);
              return Promise.resolve({
                'earn_point': 0,
                'final_point': 0,
                'shop_spent': user_point,
                'shop_value': user_point_price,
              })
            }
          }
          else {
            return new LoyaltyGroupModel().getLoyaltyGroups()
              .then(res => {
                valid_loyaltyGroups = res.filter(el => el.min_score <= user_point);
                if (!valid_loyaltyGroups.length) {
                  scoreArray = res.map(el => el.min_score);
                  maxScore = Math.min(...scoreArray);
                  customer_loyaltyGroup = res.filter(el => el.min_score === maxScore)[0];

                } else {
                  scoreArray = valid_loyaltyGroups.map(el => el.min_score);
                  maxScore = Math.max(...scoreArray);
                  customer_loyaltyGroup = valid_loyaltyGroups.filter(el => el.min_score === maxScore)[0];
                }

                return new DeliveryDurationInfoModel().getAllDurationInfo()
              })
              .then(res => {
                duration_info = res.filter(el => el.delivery_days === duration_days)[0];
                duration_loyalty_info = duration_info.delivery_loyalty.filter(el => el.name.toLowerCase() === customer_loyaltyGroup.name.toLowerCase())[0];
                loyalty_group_price = duration_loyalty_info.price;
                deliveryCostInDuration = duration_info.cities[0].delivery_cost - Math.floor(duration_info.cities[0].delivery_cost * duration_loyalty_info.discount / 100);

                used_delivery_loyalty_point = Math.floor(deliveryCostInDuration / loyalty_group_price);


                if (used_delivery_loyalty_point >= user_point) {
                  console.log('state 1');
                  return Promise.resolve({
                    'earn_point': 0,
                    'final_point': 0,
                    'delivery_spent': user_point,
                    'delivery_value': user_point * loyalty_group_price,
                  })
                }
                else {
                  remain_point = user_point - used_delivery_loyalty_point;
                  shop_cost = total_amount - (deliveryCostInDuration);
                  used_shop_point = Math.floor(shop_cost / shop_value_offer);

                  if (used_shop_point >= remain_point) {
                    console.log('state 2');
                    return Promise.resolve({
                      'earn_point': 0,
                      'final_point': 0,
                      'delivery_spent': used_delivery_loyalty_point,
                      'delivery_value': used_delivery_loyalty_point * loyalty_group_price,
                      'shop_spent': remain_point,
                      'shop_value': remain_point * shop_value_offer,
                    })
                  }
                  else {
                    console.log('state 3');
                    return Promise.resolve({
                      'earn_point': 0,
                      'final_point': user_point - used_delivery_loyalty_point - used_shop_point,
                      'delivery_spent': used_delivery_loyalty_point,
                      'delivery_value': used_delivery_loyalty_point * loyalty_group_price,
                      'shop_spent': used_shop_point,
                      'shop_value': used_shop_point * shop_value_offer,
                    })
                  }

                }
              })
          }
        }

        if (!is_collect) {
          return Promise.resolve({
            'earn_point': earn_point,
            'final_point': user_point + earn_point,
          });
        }

        return new LoyaltyGroupModel().getLoyaltyGroups()
          .then(res => {
            if (!res || !res.length)
              return Promise.resolve();

            valid_loyaltyGroups = res.filter(el => el.min_score <= user_point);
            if (!valid_loyaltyGroups.length) {
              scoreArray = res.map(el => el.min_score);
              maxScore = Math.min(...scoreArray);
              customer_loyaltyGroup = res.filter(el => el.min_score === maxScore);

            } else {
              scoreArray = valid_loyaltyGroups.map(el => el.min_score);
              maxScore = Math.max(...scoreArray);
              customer_loyaltyGroup = valid_loyaltyGroups.filter(el => el.min_score === maxScore);
            }

            return new DeliveryDurationInfoModel().getClickAndCollect();
          })
          .then(res => {
            let addedPoint = 0;
            if (res)
              addedPoint = parseInt(res[0].add_point.filter(el => el.name === customer_loyaltyGroup[0].name)[0].added_point);

            return Promise.resolve({
              'earn_point': earn_point || 0 + addedPoint || 0,
              'final_point': user_point || 0 + earn_point || 0 + addedPoint || 0
            });
          })
      })
  };

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
          instance_id: {$first: '$order_lines.product_instance_id'},
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
          return models()['Campaign' + (Order.test ? 'Test' : '')].find({'coupon_code': body.coupon_code});
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

}

Order.test = false;
module.exports = Order;

