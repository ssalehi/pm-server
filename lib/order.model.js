const Base = require('./base.model');
const env = require('../env');
const error = require('./errors.list');
const mongoose = require('mongoose');
const rp = require('request-promise');
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

const dailyReportHour = env.dailyReportHour;

const parseString = require('xml2js').parseString;
let crypto;
try {
  crypto = require('crypto');
} catch (e) {
  console.error(e);
}

const inventoryCount = function (instance) {
  const inventory = instance.inventory;
  return inventory && inventory.length ? inventory.map(i => i.count - (i.reserved ? i.reserved : 0)).reduce((a, b) => a + b) : 0;
};

const actionObj = {
  shop: "1003",
  refund: "1004",
};

class Order extends Base {

  constructor(test = Order.test) {
    super('Order', test);
    this.OrderModel = this.model;
  }

  async getById(orderId) {
    try {

      let order = await this.OrderModel.findOne({
        _id: mongoose.Types.ObjectId(orderId)
      }).lean();

      return Promise.resolve(order);
    } catch (err) {
      console.log('-> ');
      throw err;
    }

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
        },
        tickets: []
      }, {
        upsert: true,
        new: true
      })
  }

  async changeStateAsCanceled(order, orderLine) {
    try {
      return this.OrderModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(order._id),
        'order_lines._id': mongoose.Types.ObjectId(orderLine._id)
      }, {
        $set: {
          'order_lines.$.cancel': true
        }
      }, {new: true}).lean();

    } catch (err) {
      console.log('-> error on canceling order line');
      throw err;
    }
  }

  async resetCanceledInventory(order, orderLine) {
    try {


    } catch (err) {
      console.log('-> error on reset canceled orderline inventory', err);
      throw err;
    }
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
        });
        return Promise.resolve(arr);
      })
      .catch(err => {
        return Promise.reject(err);
      })
  }

  prepareDataForBankGateway(user, data) {
    // preparing data (mainly generate digital sign), to send to client form , and then send to bank gateway therefrom
    let signedString;
    data.total_amount = 1000; // only for test, should remove later
    const time = moment().format("YYYY/MM/DD HH:mm:ss").toString();
    const redirectAddress = env.redirect_address;
    const invoiceNumber = mongoose.Types.ObjectId().toString();
    const invoiceDate = time;
    const timeStamp = time;
    const action = actionObj.shop;
    let email = (user && user.access_level === undefined) ? user.username : data.address.recipient_email;
    let mobile = (user && user.access_level === undefined) ? user.mobile_no : data.address.recipient_mobile_no;
    let dataArr = ["",
      env.merchant_code,
      env.terminal_code,
      invoiceNumber,
      invoiceDate,
      data.total_amount,
      redirectAddress,
      action,
      timeStamp,
      ""];
    try {
      signedString = this.generateDigitalSignature(dataArr);
    } catch (err) {
      console.log('====>>', err);
      throw err;
    }
    const bankDataObj = {
      invoiceNumber,
      invoiceDate,
      amount: data.total_amount,
      terminalCode: env.terminal_code,
      merchantCode: env.merchant_code,
      redirectAddress,
      timeStamp,
      action,
      mobile,
      email,
      sign: signedString,
    };

    return new Promise((resolve, reject) => {
      this.checkoutCart(user, invoiceNumber, invoiceDate, data.cartItems, data.order_id, data.address, data.transaction_id, data.used_point,
        data.used_balance, data.total_amount, data.is_collect, data.discount, data.duration_days, data.time_slot, data.paymentType, data.loyalty)
        .then(res => {
          resolve(bankDataObj);
        }).catch(err => {
        console.error('ERROR : ', err);
        reject(err);
      })
    });
  }

  readPayResult(user, data) {
    let xmlToNodeReadRes;
    let xmlToNodeVerifyRes;
    let notPayedOrder = null;
    let cartItems = [];
    let formData = null;
    if (data && data.tref) {
      formData = {
        invoiceUID: data.tref,
      };
    } else {
      formData = {
        merchantCode: env.merchant_code,
        terminalCode: env.terminal_code,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
      };
    }
    return new Promise((resolve, reject) => { // read transaction result
      // TODO check repeated factors
      this.OrderModel.aggregate([
        {
          $match: {
            $and: [
              {invoice_number: data.invoiceNumber}, {is_cart: true},
              {'IPG_data.transaction_id': null},
              {'IPG_data.invoice_number': data.invoiceNumber},
              {'IPG_data.invoice_date': data.invoiceDate}
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
            _id: 1,
            order_line_id: '$order_lines._id',
            total_amount: '$total_amount',
            IPG_data: '$IPG_data',
            instance: {
              '_id': '$product.instances._id',
              'product_id': '$product._id',
              'product_name': '$product.name',
              'size': '$product.instances.size',
              'inventory': '$product.instances.inventory'
            },
            cmp_value: {
              $cmp: ['$order_lines.product_instance_id', '$product.instances._id']
            }
          },
        },
        {
          $match: {
            cmp_value: {
              $eq: 0
            }
          }
        },
        {
          $group: {
            _id: '$instance._id',
            order_id: {
              $first: '$_id',
            },
            order_line_id: {
              $first: '$order_line_id',
            },
            instance: {
              $first: '$instance',
            },
            quantity: {$sum: 1},
            total_amount: {$first: '$total_amount'},
            IPG_data: {
              $first: '$IPG_data'
            }
          }
        },
      ])
        .then(res => {
          notPayedOrder = res;
          if (!res || res.length === 0) {
            return Promise.reject(error.invalidInvoice);
          }

          return rp({
            method: 'post',
            uri: env.check_transaction_result_url,
            form: formData,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            json: true,
            resolveWithFullResponse: true
          })
        })
        .then(res => {
          parseString(res.body, function (err, result) {
            xmlToNodeReadRes = result.resultObj;
          });
          if (xmlToNodeReadRes.result[0] === 'False') {  // transaction is unsuccessful (result: false), no need to continue,
            // should reject a meaningful error
            console.log('Shop Unsuccessful : NOTRANSACTON Or NOINVOICE happened ');
            return Promise.reject(xmlToNodeReadRes);
          }

          if (xmlToNodeReadRes.result[0] === 'True') {  // transaction is successful (result: true), need to final checkout
            // TODO check repeated factors
            if (xmlToNodeReadRes.terminalCode[0] === env.terminal_code.toString() &&
              xmlToNodeReadRes.merchantCode[0] === env.merchant_code.toString() &&
              xmlToNodeReadRes.action[0] === notPayedOrder[0].IPG_data.action.toString() &&
              // moment(xmlToNodeReadRes.invoiceDate[0]).toDate() === notPayedOrder[0].IPG_data.invoice_date
              xmlToNodeReadRes.invoiceDate[0].toString() === data.invoiceDate &&  // should check in correct manner
              xmlToNodeReadRes.invoiceNumber[0].toString() === notPayedOrder[0].IPG_data.invoice_number.toString()) {
              //should final check for last time
              return Promise.resolve(notPayedOrder);
            } else {
              console.log('Invoice information doesn\'t match with the original invoice');
              return Promise.reject(error.invalidInvoice);
            }
          }
        })
        .then(res => {
          console.log('RESULTTT : ', res);
          const productIds = [];
          const productInsIds = [];
          if (notPayedOrder[0].total_amount.toString() !== xmlToNodeReadRes.amount[0])
            return Promise.reject(error.invalidInvoice);

          notPayedOrder.forEach(el => {
            let count = 0;
            el.instance.inventory.forEach(inv => count += inv.count - inv.reserved);
            cartItems.push({
              product_instance_id: el._id,
              product_id: el.instance.product_id,
              count: count,
              quantity: el.quantity,
            });
            productIds.push(el.instance.product_id);
            productInsIds.push(el._id);
          });
          return this.finalCheckAfterPayment(cartItems);
        })
        .then(res => {
          let soldOuts = res.filter(x => x.errors && x.errors.length && x.errors.includes('soldOut'));
          if (soldOuts && soldOuts.length) {
            console.log('product is sold out right before payment');
            return Promise.reject(error.soldOutBeforePayment);
          }
          return this.verifyPayment(user, data, xmlToNodeReadRes);
        })
        .then(res => {
          xmlToNodeVerifyRes = res;
          resolve({xmlToNodeReadRes, xmlToNodeVerifyRes});
        })
        .catch(err => {
          reject(err);
        });
    })
  }

  finalCheckAfterPayment(cartItems) {
    return Promise.all(cartItems
      .map(initialValues => new ProductModel(Order.test).getProduct(initialValues.product_id.toString())
        .then(product => Object.assign(product, {initialValues}))))
      .then(arr => {
        arr.forEach((r, i) => {

          const foundInstance = r.instances.find(x => x._id.toString() === r.initialValues.product_instance_id.toString());
          r.errors = [];

          r.count = inventoryCount(foundInstance);
          if (r.initialValues.quantity > r.count) {
            r.errors.push('soldOut');
          }
        });
        return Promise.resolve(arr);
      });
  }


  verifyPayment(user, data, xmlToNodeReadRes) {
    console.log("Verifying data");
    let xmlToNodeVerifyRes;
    let time = moment().format("YYYY/MM/DD HH:mm:ss").toString();
    const dssModel = new DSSModel(Order.test);
    let tempRes;

    let dataArr = ["",
      env.merchant_code,
      env.terminal_code,
      data.invoiceNumber,
      data.invoiceDate,
      xmlToNodeReadRes.amount[0],
      time,
      ""];
    const signedString = this.generateDigitalSignature(dataArr);
    let shopConfirmData = {
      merchantCode: env.merchant_code,
      terminalCode: env.terminal_code,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      amount: xmlToNodeReadRes.amount[0],
      timeStamp: time,
      sign: signedString,
    };

    return rp({
      method: 'post',
      uri: env.verify_payment_url,
      form: shopConfirmData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      parseString(res.body, function (err, result) {
        xmlToNodeVerifyRes = result.actionResult;
      });

      if (xmlToNodeVerifyRes.result[0] == 'True') {
        console.log('updating database, order collection');
        return this.OrderModel.findOneAndUpdate({
            invoice_number: data.invoiceNumber,
          }, {
            $set: {
              is_cart: false, transaction_id: data.tref, IPG_data: {
                result: xmlToNodeReadRes.result[0],
                action: xmlToNodeReadRes.action[0],
                invoice_number: data.invoiceNumber,
                invoice_date: data.invoiceDate,
                transaction_id: data.tref,
                trace_number: xmlToNodeReadRes.traceNumber[0],
                reference_number: xmlToNodeReadRes.referenceNumber[0],
                transaction_date: xmlToNodeReadRes.transactionDate[0],
                terminal_code: env.terminal_code,
                merchant_code: env.merchant_code,
                amount: xmlToNodeReadRes.amount[0],
              }
            }
          },
          {new: true}).lean()
      } else {
        return Promise.reject(xmlToNodeVerifyRes);
      }
    })
      .then(res => {
        tempRes = res;
        console.log('updating database customer collection');
        if (user && user.access_level === undefined) {
          return models()['Customer' + (Order.test ? 'Test' : '')].findOneAndUpdate({
              _id: mongoose.Types.ObjectId(res.customer_id),
              is_guest: false,
            },
            {$set: {loyalty_points: res.loyalty.final_point}}
          )
        }
        else {
          return Promise.resolve();
        }
      })
      .then(res => {
        return dssModel.startProcess(tempRes);
      })
      .then(res => {
        return Promise.resolve(xmlToNodeVerifyRes);
      })
      .catch(err => {
        return Promise.reject(err)
      });
  }

  generateDigitalSignature(dataArr) {
    try {
      const privateKey = env.private_key;
      let arr = ['-----BEGIN PRIVATE KEY-----'];
      for (let i = 0; i < Math.ceil(privateKey.length / 64); i++) {
        arr.push(privateKey.slice(i * 64, (i + 1) * 64));
      }
      arr.push('-----END PRIVATE KEY-----');
      const pemKey = arr.join('\n');

      const dataString = dataArr.join('#');
      const sign = crypto.createSign('SHA1');
      sign.write(dataString, 'utf8');
      sign.end();
      return sign.sign(pemKey, 'base64');
    } catch (err) {
      console.log('--> ', err);
      throw error.generateSignatureFailed;
    }
  }

  checkoutCart(user, invoice_number, invoice_date, cartItems, orderId, address,
               transaction_id, used_point, used_balance, total_amount, is_collect, discount, duration_days, time_slot, paymentType, recievedLoyalty) {

    if (is_collect) {
      duration_days = null;
      time_slot = null;
    }
    let total_loyalty_point;
    let loyalty = {
      delivery_spent: 0,
      shop_spent: 0,
      delivery_value: 0,
      shop_value: 0,
      earn_point: 0,
      final_point: 0,
    };

    let IPG_data = {
      result: null,
      action: actionObj.shop,
      invoice_number: invoice_number,
      invoice_date: invoice_date,
      transaction_id: null,
      trace_number: null,
      reference_number: null,
      transaction_date: null,
      terminal_code: env.terminal_code,
      merchant_code: env.merchant_code,
      amount: total_amount,
    };

    if (!address || (!is_collect && (!duration_days || !time_slot || (!paymentType && paymentType !== 0)))) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    const values = {
      transaction_id,
      used_point,
      used_balance,
      address,
      is_collect,
      total_amount,
      discount,
      duration_days,
      time_slot,
      invoice_number,
      IPG_data,
      order_time: moment(),
    };


    if (!is_collect)
      values.order_time.isAfter(_const.EXPIRE_ADD_ORDER_TIME) ?
        values.delivery_expire_day = moment().add(duration_days + 1, 'days') : values.delivery_expire_day = moment().add(duration_days, 'days');

    if (user && user.access_level === undefined) {
      if (!orderId || !mongoose.Types.ObjectId.isValid(orderId))
        return Promise.reject(error.invalidId);


      return this.earnSpentPoint(user, paymentType, total_amount, is_collect, duration_days, recievedLoyalty, discount)
        .then(res => {
          total_loyalty_point = res.final_point;
          loyalty.final_point = res.final_point;
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
          return Promise.resolve(res);
        })
        .catch(err => {
          return Promise.reject(err);
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
          return Promise.resolve(res);
        })
        .catch(err => {
          return Promise.reject(err);
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
              .catch(err => {
                return Promise.reject(err);
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
      .catch(err => {
        console.log('////', err);
        return Promise.reject(err);
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
        // $match: {customer_id: mongoose.Types.ObjectId(user.id), 'address._id': {$exists: false}, is_cart: true}
        $match: {customer_id: mongoose.Types.ObjectId(user.id), is_cart: true}
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

  async getDailySalesReport(user) {

    let today = moment(moment().format('YYYY-MM-DD')).set({
      'hour': dailyReportHour,
      'minute': '00',
      'second': '00'
    }).toDate();

    let yesterday = moment(moment().add(-1, 'd').format('YYYY-MM-DD')).set({
      'hour': dailyReportHour,
      'minute': '00',
      'second': '00'
    }).toDate();


    let result = await new Order(this.test).model.aggregate([
      {
        $match: {
          $and: [{
            is_cart: false
          },
            {
              transaction_id: {
                $ne: null
              }
            },
            {
              order_time: {$gte: yesterday, $lte: today},
            }
          ]
        }
      }, {
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
        $addFields: {
          'total_order_lines': {
            $size: '$order_lines'
          }
        }
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          customer: {
            '_id': '$customer._id',
            'first_name': '$customer.first_name',
            'surname': '$customer.surname'
          },
          order_time: 1,
          total_amount: 1,
          total_order_lines: '$total_order_lines',
        }
      },
      {
        $group: {
          _id: '$_id',
          customer: {
            $first: '$customer'
          },
          order_time: {
            $first: '$order_time'
          },
          total_amount: {
            $first: '$total_amount'
          },
          total_order_lines: {
            $first: '$total_order_lines'
          }
        }
      }, {
        $sort: {
          'order_time': 1
        }
      }
    ]);
    return result;
  }


  checkoutCartDemo(user, cartItems, orderId, address,
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

    let IPG_data = {};

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
      invoice_number: null,
      IPG_data,
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

}

Order.test = false;
module.exports = Order;

