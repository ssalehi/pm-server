const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const _const = require('./const.list');
const socket = require('../socket');
const AgentModel = require('./agent.model');
const moment = require('moment');

/**
 * this class used either by ticketAction or DSS class
 * order and order line must not be queried here in case of set ticket. meaning that instance of order and order line are always passed to set ticket method.
 */
class Ticket {

  constructor(test) {
    this.test = test;
  }

  closeCurrentTicket(order, orderLine, userId, isOrderTicket = false) {

    const Order = require('./order.model');
    let query = {
      _id: order._id
    }
    if (!isOrderTicket)
      return new Order(this.test).model.update(query, {
        '$set': {
          'order_lines.$[i].tickets.$[j].is_processed': true,
          'order_lines.$[i].tickets.$[j].agent_id': userId,
        }
      }, {
          arrayFilters: [{
            'i._id': orderLine._id
          },
          {
            'j.is_processed': false
          }
          ]
        });
    else
      return new Order(this.test).model.update(query, {
        '$set': {
          'tickets.$[i].is_processed': true,
          'tickets.$[i].agent_id': userId,
        }
      }, {
          arrayFilters: [
            {
              'i.is_processed': false
            }
          ]
        });
  }

  /**
   * 
   * @param {*} order
   * @param {*} orderLine 
   * @param {*} status 
   * @param {*} receiverId : receiver might be warehosue or agents
   * @param {*} desc : some tickets such as delivery needs this field
   * @param {*} isLastTicket : last ticket must be closed
   * @param {*} userId : userId shows agent who closed the ticket
   * @param {*} isOrderTicket : ticket is related to order itself or its orderline
   * 
   */
  addNewTicket(order, orderLine, status, receiverId, desc = null, isLastTicket = false, userId = null, isOrderTicket = false) {

    if (!receiverId && !isOrderTicket)
      return Promise.reject(error.ticketReceiverRequired)

    let query = isOrderTicket ? {
      '_id': mongoose.Types.ObjectId(order._id),
    } : {
        '_id': mongoose.Types.ObjectId(order._id),
        'order_lines._id': mongoose.Types.ObjectId(orderLine._id)
      };

    let update = {
      'status': status,
      'desc': desc
    };
    if (receiverId)
      update['receiver_id'] = mongoose.Types.ObjectId(receiverId);

    if (isLastTicket && userId) {
      update['is_processed'] = true;
      update['agent_id'] = userId;
    }
    let newTicketUpdate = isOrderTicket ? {
      '$addToSet': {
        'tickets': update
      }
    } :
      {
        '$addToSet': {
          'order_lines.$.tickets': update
        }
      };

    const Order = require('./order.model');

    return new Order(this.test).model.findOneAndUpdate(query, newTicketUpdate, {
      new: true
    }).lean()
  }

  setTicket(order, orderLine, status, userId, receiverId, desc = null, isLastTicket = false, isOrderTicket = false) {

    if (!order)
      return Promise.reject(error.orderNotFound);

    if (!orderLine && !isOrderTicket)
      return Promise.reject(error.orderLineNotFound);

    const lastTicket = isOrderTicket ?
      (order.tickets && order.tickets.length ? order.tickets[order.tickets.length - 1] : null)
      :
      (orderLine.tickets && orderLine.tickets.length ? orderLine.tickets[orderLine.tickets.length - 1] : null)


    if (lastTicket && !lastTicket.is_processed && lastTicket.status === status)
      return Promise.resolve();

    if (!isOrderTicket && !Object.values(_const.ORDER_LINE_STATUS).find(x => x === status))
      return Promise.reject(error.invalidTicket)

    if (isOrderTicket && !Object.values(_const.ORDER_STATUS).find(x => x === status))
      return Promise.reject(error.invalidTicket)

    return this.closeCurrentTicket(order, orderLine, userId, isOrderTicket)
      .then(res => this.addNewTicket(order, orderLine, status, receiverId, desc, isLastTicket, userId, isOrderTicket))
      .then(res => {
        order = res;
        if (!isOrderTicket)
          orderLine = res.order_lines.find(el => el._id.toString() === orderLine._id.toString());
        return Promise.resolve({
          order,
          orderLine
        });
      });
  }


  async setOrderLineAsWatingForOnlineWarehouse(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as waiting for online warehouse');
      throw err;
    }
  }
  async setOrderLineAsVerfiedByOnlineWarhouse(order, orderLine, userId, warehouseId, isLastTicket) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.OnlineWarehouseVerified, userId, warehouseId, null, isLastTicket);
    } catch (err) {
      console.log('-> error on set order line as waiting for online warehouse');
      throw err;
    }
  }

  async setOrderLineAsWaitingForAggregation(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.WaitForAggregation, userId, warehouseId);
    } catch (err) {
      console.log('-> ', 'error on set order as watining for aggregation');
      throw err;
    }
  }

  async setOrderAsWaitingForAggregation(order) {
    try {
      return this.setTicket(order, null, _const.ORDER_STATUS.WaitForAggregation, null, null, null, false, true);
    } catch (err) {
      console.log('-> ', 'error on set order as watining for aggregation');
      throw err;
    }
  }

  async setOrderAsReadyForInvoice(order, userId, warehouseId) {
    try {

      this.setTicket(order, null, _const.ORDER_STATUS.ReadyForInvoice, userId, warehouseId, null, false, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }
  async setOrderLineAsNotExists(order, order_line) {
    try {
      const TicketModel = require('./ticket.model');

      let salesManager = await new AgentModel(this.test).getSalesManager()
      if (!salesManager)
        throw error.salesManagerNotFound;

      await new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_LINE_STATUS.NotExists, null, salesManager._id)

      if (!this.test)
        socket.sendToNS(salesManager._id)
    } catch (err) {
      console.log('-> ', 'error on set as not exists');
      throw err;
    }
  }

  async setOrderLineAsReserved(order, order_line, prefferedWarehouse, renew = false) {

    try {
      let res = await new ProductModel(this.test).setInventory({
        id: order_line.product_id,
        productInstanceId: order_line.product_instance_id,
        warehouseId: prefferedWarehouse._id,
        delReserved: 1
      })
      if (res && res.n === 1 && res.nModified === 1) {
        await this.setTicket(order, order_line, renew ? _const.ORDER_LINE_STATUS.Renew : _const.ORDER_LINE_STATUS.default, null, prefferedWarehouse._id)
      } else {
        throw error.invalidInventoryCount;
      }
      socket.sendToNS(prefferedWarehouse._id);
    } catch (err) {
      console.log('-> ', 'error on set order line as reserved');
      throw err;
    }
  }

  async search(options, offset, limit, user) {

    try {
      let search;

      if (options && options.type === _const.LOGISTIC_SEARCH.ScanInbox) {
        if (!user.warehouse_id)
          return Promise.reject(error.ticketReceiverRequired);

        if (user.access_level === _const.ACCESS_LEVEL.ShopClerk)
          search = this.searchScanInbox(user.warehouse_id, offset, limit);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.ToCustomerBox) {
        if (!user.warehouse_id)
          return Promise.reject(error.ticketReceiverRequired);

        if (user.access_level === _const.ACCESS_LEVEL.HubClerk)
          search = this.searchSendToCustomerBox(user.warehouse_id, offset, limit);
      }

      if (!search || !search.mainQuery || !search.countQuery)
        throw error.invalidSearchQuery;

      const Order = require('./order.model');

      let result = await new Order(this.test).model.aggregate(search.mainQuery);
      let res = await new Order(this.test).model.aggregate(search.countQuery)
      let totalCount = res[0] ? res[0].count : 0;
      return Promise.resolve({
        data: result,
        total: totalCount,
      });

    } catch (err) {
      console.log('-> error on search');
      throw err;
    }


  }


  searchScanInbox(receiverId, offset, limit) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
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
        $addFields: {
          'last_ticket': {
            "$arrayElemAt": ["$order_lines.tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.default,
                _const.ORDER_LINE_STATUS.Renew,
                _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                _const.ORDER_LINE_STATUS.Delivered
              ]
            }
          }]
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
          order_time: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
          total_order_lines: '$total_order_lines',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
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
          order_time: {
            $first: '$order_time',
          },
          order_line_id: {
            $first: '$order_line_id',
          },
          adding_time: {
            $first: '$adding_time',
          },
          tickets: {
            $first: '$tickets',
          },
          product_colors: {
            $first: '$product_colors',
          },
          total_order_lines: {
            $first: '$total_order_lines',
          },
          instance: {
            $first: '$instance',
          },
          count: {
            $sum: 1
          }
        }
      },
      {
        $sort: {
          'order_time': 1,
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
          $and: [{
            is_cart: false
          },
          {
            transaction_id: {
              $ne: null
            }
          },
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
        $addFields: {
          'last_ticket': {
            "$arrayElemAt": ["$order_lines.tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.default,
                _const.ORDER_LINE_STATUS.Renew,
                _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                _const.ORDER_LINE_STATUS.Delivered
              ]
            }
          }]
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
          instance: {
            '_id': '$product.instances._id',
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
            $first: '$_id'
          }
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }

  searchSendToCustomerBox(receiverId, offset, limit) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          $and: [{
            is_cart: false
          },
          {
            is_collect: false
          },
          {
            transaction_id: {
              $ne: null
            }
          },
          ]
        }
      },
      {
        $addFields: {
          'last_order_ticket': {
            "$arrayElemAt": ["$tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $eq: _const.ORDER_STATUS.ReadyForInvoice
            }
          }]
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
        $addFields: {
          'last_ticket': {
            "$arrayElemAt": ["$order_lines.tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.Delivered,
                _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
              ]
            }
          }]
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
          is_collect: 1,
          order_time: 1,
          customer_id: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
          total_order_lines: '$total_order_lines',
          address: 1,
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          cmp_value: {
            $cmp: ['$order_lines.product_instance_id', '$product.instances._id']
          }
        }
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
          _id: '$_id',
          is_collect: {
            $first: '$is_collect'
          },
          address: {
            $first: '$address'
          },
          order_time: {
            $first: '$order_time'
          },
          total_order_lines: {
            $first: '$total_order_lines'
          },
          order_lines: {
            $push: {
              order_line_id: '$order_line_id',
              adding_time: '$adding_time',
              tickets: '$tickets',
              product_colors: '$product_colors',
              instance: '$instance',
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          is_collect: 1,
          address: 1,
          order_time: 1,
          total_order_lines: 1,
          order_lines: 1,
          cmp_value: {
            $cmp: ['$total_order_lines', {$size: '$order_lines'}]
          }
        }
      },
      {
        $match: {
          cmp_value: {
            $eq: 0
          }
        }
      },
      {
        $sort: {
          'order_time': 1,
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
          $and: [{
            is_cart: false
          },
          {
            is_collect: false
          },
          {
            transaction_id: {
              $ne: null
            }
          },
          ]
        }
      },
      {
        $addFields: {
          'last_order_ticket': {
            "$arrayElemAt": ["$tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $eq: _const.ORDER_STATUS.ReadyForInvoice
            }
          }]
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
        $addFields: {
          'last_ticket': {
            "$arrayElemAt": ["$order_lines.tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.Delivered,
                _const.ORDER_LINE_STATUS.OnlineWarehouseVerified
              ]
            }
          }]
        }
      },
      {
        $group: {
          _id: '$_id',
          order_lines: {
            $push: {
              _id: '$order_lines._id',
            }
          },
          total_order_lines: {
            $first: '$total_order_lines'
          }
        }
      },
      {
        $project: {
          _id: 1,
          cmp_value: {
            $cmp: ['$total_order_lines', {$size: '$order_lines'}]
          }
        }
      },
      {
        $match: {
          cmp_value: {
            $eq: 0
          }
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }

  getRemainder(receiverId, tickets, is_collect = false) {
    const Order = require('./order.model');
    return new Order(this.test).model.aggregate([
      {
        $match: {
          $and: [{
            is_cart: false
          },
          {
            is_collect
          },
          {
            transaction_id: {
              $ne: null
            }
          },
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
        $addFields: {
          'last_ticket': {
            "$arrayElemAt": ["$order_lines.tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: tickets
            }
          }]
        }
      }
    ]);
  }

  getHistoryOrderLine(params) {

    let groupParams = {
      $push: {
        is_processed: '$order_line.tickets.is_processed',
        receiver_warehouse: "$receiver_warehouse",
        receiver_agent: "$receiver_agent",
        desc: "$order_line.tickets.desc",
        timestamp: "$order_line.tickets.timestamp",
        status: "$order_line.tickets.status",
        agent: "$agent"
      }
    };

    const Order = require('./order.model');

    if (!mongoose.Types.ObjectId.isValid(params.orderId) ||
      !mongoose.Types.ObjectId.isValid(params.orderLineId)) {
      return Promise.reject(error.invalidId);
    }
    return new Order(this.test).model.aggregate([{
      $match: {
        '_id': mongoose.Types.ObjectId(params.orderId),
      }
    },
    {
      $project: {
        order_line: {
          $filter: {
            input: "$order_lines",
            as: "order_line",
            cond: {
              $eq: ["$$order_line._id", mongoose.Types.ObjectId(params.orderLineId)],
            },
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
        tickets: groupParams,
      }
    },
    {
      $project: {
        _id: 1,
        tickets: {
          $filter: {
            input: "$tickets",
            as: "ticket",
            cond: {
              $ne: ["$$ticket", null],
            }
          },
        },
      }
    },

    ]);

  }

  getHistoryOrderByReceiver(params, user) {

    const Order = require('./order.model');

    if (!mongoose.Types.ObjectId.isValid(params.orderId)) {
      return Promise.reject(error.invalidId);
    }
    return new Order(this.test).model.aggregate([{
      $match: {
        '_id': mongoose.Types.ObjectId(params.orderId),
      }
    },
    {
      $project: {
        order_line: {
          $filter: {
            input: "$order_lines",
            as: "order_line",
            cond: {
              $ne: ["$$order_line._id", 1],
            },
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
            $cond: {
              if: {
                $eq: ['$order_line.tickets.receiver_id', user._id]
              },
              then: {
                is_processed: '$order_line.tickets.is_processed',
                receiver_warehouse: "$receiver_warehouse",
                receiver_agent: "$receiver_agent",
                desc: "$order_line.tickets.desc",
                timestamp: "$order_line.tickets.timestamp",
                status: "$order_line.tickets.status",
                agent: "$agent"
              },
              else: null
            }

          }
        },
      }
    },
    {
      $project: {
        _id: 1,
        tickets: {
          $filter: {
            input: "$tickets",
            as: "ticket",
            cond: {
              $ne: ["$$ticket", null],
            }
          },
        },
      }
    },

    ]);

  }
}


module.exports = Ticket;
