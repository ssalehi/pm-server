const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const helpers = require('./helpers');
const _const = require('./const.list');
const env = require('../env');
const socket = require('../socket');
const AgentModel = require('./agent.model');


/**
 * this class used either by ticketAction or DSS class
 * order and order line must not be queried here. meaning that instance of order and order line are always passed to set ticket method.
 */
class Ticket {

  constructor(test) {
    this.test = test;
  }

  closeCurrentTicket(order, orderLine, userId) {

    if (orderLine.tickets.length && !userId)
      return Promise.reject(error.noUser);

    const Order = require('./order.model');
    let query = {
      _id: order._id
    }
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
    })

  }

  /**
   * 
   * @param {*} order
   * @param {*} orderLine 
   * @param {*} status 
   * @param {*} receiverId : receiver might be warehosue or agents
   * @param {*} desc : some tickets such as delivery needs this field
   */
  addNewTicket(order, orderLine, status, receiverId, desc = null, isLastTicket = false, userId = null) {

    if (!receiverId)
      return Promise.reject(error.ticketReceiverRequired)

    let query = {
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
    let newTicketUpdate = {
      '$addToSet': {
        'order_lines.$.tickets': update
      }
    };

    const Order = require('./order.model');

    return new Order(this.test).model.update(query, newTicketUpdate);

  }

  setTicket(order, orderLine, status, userId, receiverId, desc = null, isLastTicket = false) {

    if (!order)
      return Promise.reject(error.orderNotFound);

    if (!orderLine)
      return Promise.reject(error.orderLineNotFound);


    const lastTicket = orderLine.tickets && orderLine.tickets.length ? orderLine.tickets[orderLine.tickets.length - 1] : null;
    if (lastTicket && !lastTicket.is_processed && lastTicket.status === status)
      return Promise.resolve();

    if (!Object.values(_const.ORDER_STATUS).find(x => x === status))
      return Promise.reject(error.invalidTicket)

    return this.closeCurrentTicket(order, orderLine, userId)
      .then(res => this.addNewTicket(order, orderLine, status, receiverId, null, isLastTicket, userId))
  }


  setAsNotExists(order, order_line) {

    const TicketModel = require('./ticket.model');

    return new AgentModel(this.test).getSalesManager()
      .then(salesManager => {
        if (!salesManager) {
          return Promise.reject(error.salesManagerNotFound)
        }
        return new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_STATUS.NotExists, null, salesManager._id)
          .then(res => {
            socket.sendToNS(salesManager._id)
          })
      })

  }

  setAsReserved(order, order_line, prefferedWarehouse) {

    return new ProductModel(this.test).setInventory({
        id: order_line.product_id,
        productInstanceId: order_line.product_instance_id,
        warehouseId: prefferedWarehouse._id,
        delReserved: 1
      })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          this.setTicket(order, order_line, _const.ORDER_STATUS.default, null, prefferedWarehouse._id)
        } else {
          return Promise.reject(error.invalidInventoryCount);
        }
      })
      .then(res => {
        socket.sendToNS(prefferedWarehouse._id)
      })
  }

  /**
   * set order line as sold out meaning that remove its reserved flag and minus its count by 1 from inventrory
   * @param {*} order 
   * @param {*} order_line 
   * @param {*} userId 
   * @param {*} warehouseId 
   */
  setAsSoldOut(order, orderLine, userId, warehouseId) {
    return new ProductModel(this.test).setInventory({
        id: orderLine.product_id.toString(),
        productInstanceId: orderLine.product_instance_id.toString(),
        warehouseId: warehouseId,
        delCount: -1,
        delReserved: -1
      })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          return this.setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, userId, warehouseId);
        } else {
          return Promise.reject(error.invalidInventoryCount);
        }

      })
  }

  search(options, offset, limit, user) {

    let search;

    if (options && options.type === 'inbox') {
      if (!user.warehouse_id)
        return Promise.reject(error.ticketReceiverRequired);

      search = this.searchInbox(user.warehouse_id, offset, limit);
    }

    if (options && options.type === 'scanReady') {
      if (!user.warehouse_id)
        return Promise.reject(error.ticketReceiverRequired);

      search = this.searchScanReadyItems(user.warehouse_id, offset, limit);
    }

    if (!search || !search.mainQuery || !search.countQuery)
      return Promise.reject(error.invalidSearchQuery);

    let result;
    const Order = require('./order.model');

    return new Order(this.test).model.aggregate(search.mainQuery).then(res => {
        result = res;
        return new Order(this.test).model.aggregate(search.countQuery)

      })
      .then(res => {
        let totalCount = res[0] ? res[0].count : 0;
        return Promise.resolve({
          data: result,
          total: totalCount,
        });
      });
  }

  searchInbox(receiverId, offset, limit) {

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
        $lookup: {
          from: 'customer',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
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
                $nin: [
                  _const.ORDER_STATUS.OnDelivery,
                  _const.ORDER_STATUS.Delivered,

                ]
              }
            },
          ]
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
          transaction_id: 1,
          total_amount: 1,
          used_point: 1,
          used_balance: 1,
          is_collect: 1,
          order_time: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
          total_order_lines: '$total_order_lines',
          address: 1,
          customer: {
            '_id': '$customer._id',
            'name': '$customer.first_name',
            'surname': '$customer.surname',
            'addresses': '$customer.addresses'
          },
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
          customer: {
            $first: '$customer'
          },
          transaction_id: {
            $first: '$transaction_id'
          },
          used_point: {
            $first: '$used_point'
          },
          used_balance: {
            $first: '$used_balance'
          },
          is_collect: {
            $first: '$is_collect'
          },
          address: {
            $first: '$address'
          },
          order_time: {
            $first: '$order_time'
          },
          total_amount: {
            $first: '$total_amount'
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
    ]

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
                $nin: [
                  _const.ORDER_STATUS.ReadyForInternalDelivery,
                  _const.ORDER_STATUS.OnInternalDelivery,
                  _const.ORDER_STATUS.ReadyToDeliver,
                  _const.ORDER_STATUS.OnDelivery,
                  _const.ORDER_STATUS.Delivered,

                ]
              }
            },
          ]
        }
      },
      {
        $group: {
          _id: '$_id'
        }
      },
      {
        $count: 'count'
      }
    ]


    return result;

  }
  searchScanReadyItems(receiverId, offset, limit) {

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
        $lookup: {
          from: 'customer',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customer'
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
                  _const.ORDER_STATUS.ReadyForInternalDelivery,
                  _const.ORDER_STATUS.OnInternalDelivery,
                  _const.ORDER_STATUS.ReadyToDeliver,
                  _const.ORDER_STATUS.OnDelivery,
                  _const.ORDER_STATUS.Delivered,

                ]
              }
            },
          ]
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
          transaction_id: 1,
          total_amount: 1,
          used_point: 1,
          used_balance: 1,
          is_collect: 1,
          order_time: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
          total_order_lines: '$total_order_lines',
          address: 1,
          customer: {
            '_id': '$customer._id',
            'name': '$customer.first_name',
            'surname': '$customer.surname',
            'addresses': '$customer.addresses'
          },
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
          customer: {
            $first: '$customer'
          },
          transaction_id: {
            $first: '$transaction_id'
          },
          used_point: {
            $first: '$used_point'
          },
          used_balance: {
            $first: '$used_balance'
          },
          is_collect: {
            $first: '$is_collect'
          },
          address: {
            $first: '$address'
          },
          order_time: {
            $first: '$order_time'
          },
          total_amount: {
            $first: '$total_amount'
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
    ]

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
        $sort: {
          'last_ticket': 1,
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
                $nin: [
                  _const.ORDER_STATUS.ReadyForInternalDelivery,
                  _const.ORDER_STATUS.OnInternalDelivery,
                  _const.ORDER_STATUS.ReadyToDeliver,
                  _const.ORDER_STATUS.OnDelivery,
                  _const.ORDER_STATUS.Delivered,

                ]
              }
            },
          ]
        }
      },
      {
        $group: {
          _id: '$_id'
        }
      },
      {
        $count: 'count'
      }
    ]


    return result;

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

    let groupParams = {
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
    };

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
}


module.exports = Ticket;
