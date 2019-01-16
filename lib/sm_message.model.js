const Base = require('./base.model');
const mongoose = require('mongoose');
const _const = require('./const.list');
const errors = require('./errors.list');
const socket = require('../socket');

class SMMessage extends Base {

  constructor(test = Brand.test) {

    super('SMMessage', test);

    this.SMMessageModel = this.model;
  }

  async pubishMessage(order_id, order_line_id, type, extra, descArgs = null) {
    try {
      let description
      if (descArgs && descArgs.length)
        description = this.makeDesc(type, descArgs);

      return this.SMMessageModel.create({
        type,
        order_id,
        order_line_id,
        description,
        extra
      });

    } catch (err) {
      console.log('-> error on publish sales manager message', err);
      throw err;
    }
  }


  makeDesc(type, args) {
    if (!args || !descArgs.length)
      return;
    try {
      switch (type) {
        case _const.SM_MESSAGE.ReturnRequest:
          break;
      }

      return null;

    } catch (err) {
      console.log('-> error on making description for sales manager message', err);
      throw err;
    }
  }

  async assignToReturn(body, user) {
    try {

      if (!body.customerId || !body.addressId)
        throw new Error('customer and address info is required to find active return delivery');

      let CustomerModel = require('./customer.model');

      let foundCustomer = await new CustomerModel(this.test).getById(body.customerId).lean();
      if (!foundCustomer)
        throw new Error('customer is not found to make return delivery');

      let foundedAddress = foundCustomer.addresses.find(x => x._id.toString() === body.addressId);
      if (!foundedAddress)
        throw new Error('address not found for customer to make return delivery');

      let DeliveryModel = require('./delivery.model');

      if (!body.preCheck && (!body.id || !body.orderId || !body.orderLineId))
        throw new Error('message id, order id and order line id are required in case of not preCheck return assignment');


      let OrderModel = require('./order.model')

      let foundOrder, foundOrderLine;

      if (!body.preCheck) {
        foundOrder = await new OrderModel(this.test).getById(body.orderId);
        if (!foundOrder)
          throw errors.orderNotFound;

        foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === body.orderLineId);
        if (!foundOrderLine)
          throw errors.orderLineNotFound;
      }

      let foundDelivery = await new DeliveryModel(this.test).assignToReturn(foundedAddress, foundOrder, foundOrderLine, body.preCheck);

      if (body.preCheck)
        return Promise.resolve({
          address: foundedAddress,
          delivery: foundDelivery
        })

      await this.SMMessageModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(body.id)
      }, {
          is_processed: true
        });

      if (!this.test)
        socket.sendToNS(user.id);

    } catch (err) {
      console.log('-> error on get active return delivery', err);
      throw err;
    }
  }

  async search(options, offset, limit) {

    try {

      let search;

      if (options && options.type === _const.LOGISTIC_SEARCH.SMInbox) {
        search = this.searchInbox(offset, limit);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.SMHistory) {
        search = this.searchHistory(offset, limit, options);
      }

      if (!search || !search.mainQuery || !search.countQuery)
        throw error.invalidSearchQuery;

      let result = await this.SMMessageModel.aggregate(search.mainQuery);
      let res = await this.SMMessageModel.aggregate(search.countQuery)
      let totalCount = res[0] ? res[0].count : 0;
      return Promise.resolve({
        data: result,
        total: totalCount,
      });

    } catch (err) {
      console.log('-> error on search in order');
      throw err;
    }

  }



  searchInbox(offset, limit) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          is_closed: false
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_id',
          foreignField: '_id',
          as: 'order'
        }
      },
      {
        $unwind: {
          path: '$order',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order.order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          is_processed: 1,
          type: 1,
          order: 1,
          extra: 1,
          publish_date: 1,
          cmp_value: {
            $cmp: ['$order.order_lines._id', '$order_line_id']
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
        $lookup: {
          from: 'customer',
          localField: 'order.customer_id',
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
        $lookup: {
          from: 'product',
          localField: 'order.order_lines.product_id',
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
          is_processed: 1,
          type: 1,
          order: 1,
          extra: 1,
          publish_date: 1,
          customer: 1,
          instance: {

            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id',
            'product_colors': '$product.colors'
          },
          cmp_value2: {
            $cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']
          }
        },
      },
      {
        $match: {
          cmp_value2: {
            $eq: 0
          }
        }
      },
      {
        $skip: Number.parseInt(offset)
      },
      {
        $limit: Number.parseInt(limit)
      }
    ];

    result.countQuery = [
      {
        $match: {
          is_closed: false
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }
}

SMMessage.test = false;

module.exports = SMMessage;