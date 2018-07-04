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
const LoyaltyGroupModel = require('./loyalty_group.model');
const DeliveryDurationInfoModel = require('./delivery_duration_info.model')
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

  checkoutCart(user, cartItems, orderId, address, customerData, transaction_id, used_point, used_balance, total_amount, is_collect, discount, duration_days, time_slot, paymentType, recievedLoyalty) {
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
      return Promise.reject(error.orderVerficationFailed);

    if (!is_collect && (!duration_days || !time_slot || paymentType === null || paymentType === undefined)) {
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
      order_time: new Date(),
    };

    if (user && user.access_level === undefined) {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId) ||
        !transaction_id
      )
        return Promise.reject(error.invalidId);


      this.earnSpentPoint(user, paymentType, total_amount, is_collect, duration_days, recievedLoyalty)
        .then(res => {
          total_loyalty_point = res;
          console.log('earn point func : ', res);
          loyalty.earn_point = res.earn_point;
          loyalty.delivery_spent = res.delivery_spent ? res.delivery_spent : 0;
          loyalty.shop_spent = res.shop_spent ? res.shop_spent : 0;
          loyalty.delivery_value = res.delivery_value ? res.delivery_value : 0;
          loyalty.shop_value = res.shop_value ? res.shop_value : 0;
          values.loyalty = loyalty;
          console.log('------------------',values);
          return this.OrderModel.findOneAndUpdate({
              _id: mongoose.Types.ObjectId(orderId)
            }, {
              $set: values
            },
            {new: true}).lean()
        })
        .then(res => {
          tempRes = res;
          return models['Customer' + (Order.test ? 'Test' : '')].findOneAndUpdate({
              _id: mongoose.Types.ObjectId(tempRes.customer_id),
              is_guest: false,
            },
            // {$inc: {loyalty_points: tempRes.loyalty.earn_point}}
            {$set: {loyalty_points: total_loyalty_point.final_point}}
          )
        })
        .then(res => {
          dssModel.startProcess(tempRes);
        })
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


  earnSpentPoint(user, paymentType, total_amount, is_collect, duration_days, recievedLoyalty) {
    let earn_point = 0;
    let system_offline_offer = 25000;  // in every 25000 tooman shop, user earn 1 score
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

        if (paymentType === 2) { // user dos not earn any point when uses his/her loyalty points eather in C&C or not

          if (is_collect) {
            let user_point_price = user_point * shop_value_offer;

            if (user_point_price > total_amount) {
              return Promise.resolve({
                'earn_point': 0,
                'final_point': user_point - Math.floor(total_amount / shop_value_offer),
                'shop_spent': Math.floor(total_amount / shop_value_offer),
                'shop_value': total_amount,
              })
            }
            else {
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
                console.log(customer_loyaltyGroup);
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
            let addedPoint = parseInt(res[0].add_point.filter(el => el.name === customer_loyaltyGroup[0].name)[0].added_point);
            return Promise.resolve({
              'earn_point': earn_point + addedPoint,
              'final_point': user_point + earn_point + addedPoint
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

}

Order.test = false;
module.exports = Order;

