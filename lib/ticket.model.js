
const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const _const = require('./const.list');
const AgentModel = require('./agent.model');
const moment = require('moment');
const Base = require('./base.model');
/**
 * this class is extended by ticketAction and DSS classes
 * order and order line must not be queried here in case of set ticket. meaning that instance of order and order line are always passed to set ticket method.
 */
class Ticket extends Base {

  constructor(test) {
    super('Order', test);
    this.test = test;
    this.OrderModel = this.model;
  }

  closeCurrentTicket(order, orderLine, userId, isOrderTicket = false) {

    let query = {
      _id: order._id
    }
    if (!isOrderTicket)
      return this.OrderModel.update(query, {
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
      return this.OrderModel.update(query, {
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
   * @param {*} userId : userId shows agent who closed the ticket
   * @param {*} isOrderTicket : ticket is related to order itself or its orderline
   *
   */
  addNewTicket(order, orderLine, status, receiverId, desc = null, isOrderTicket = false) {

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

    return this.OrderModel.findOneAndUpdate(query, newTicketUpdate, {
      new: true
    }).lean()
  }

  setTicket(order, orderLine, status, userId, receiverId, desc = null, isOrderTicket = false) {

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
      .then(res => this.addNewTicket(order, orderLine, status, receiverId, desc, isOrderTicket))
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

  async revert(order, orderLine, isOrder = false, count = 1) {
    try {

      if (!isOrder) {
        let tickets = orderLine.tickets;
        tickets.splice(tickets.length - count);

        tickets[tickets.length - 1].agent_id = null;
        tickets[tickets.length - 1].is_processed = false;

        return this.OrderModel.findOneAndUpdate({
          _id: mongoose.Types.ObjectId(order._id),
          'order_lines._id': mongoose.Types.ObjectId(orderLine._id)
        }, {

            $set: {
              'order_lines.$.tickets': tickets
            }
          }, {new: true}).lean();
      }
    } catch (err) {
      console.log('-> error on revert order ticket');
      throw err;
    }
  }


  async setOrderLineAsWatingForOnlineWarehouse(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as waiting for online warehouse');
      throw err;
    }
  }
  async setOrderLineAsWatingForOnlineWarehouseCancel(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as waiting for online warehouse');
      throw err;
    }
  }
  async setOrderLineAsVerfiedByOnlineWarhouse(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.OnlineWarehouseVerified, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as waiting for online warehouse');
      throw err;
    }
  }

  async setOrderLineAsDeliverySet(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.DeliverySet, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as delivery set ', err);
      throw err;
    }
  }

  async setOrderLineAsFinalCheck(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.FinalCheck, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as final check ', err);
      throw err;
    }
  }
  async setOrderLineAsChecked(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.Checked, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as checked ', err);
      throw err;
    }
  }

  async setOrderLineAsReadyToDeliver(order, orderLine, userId, receiverId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.ReadyToDeliver, userId, receiverId);
    } catch (err) {
      console.log('-> error on set order line as ready to deliver ', err);
      throw err;
    }
  }

  async setOrderLineAsOnDelivery(order, orderLine, userId, receiverId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.OnDelivery, userId, receiverId);
    } catch (err) {
      console.log('-> error on set order line as ready to deliver ', err);
      throw err;
    }
  }
  async setOrderLineAsDelivered(order, orderLine, userId, receiverId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.Delivered, userId, receiverId);
    } catch (err) {
      console.log('-> error on set order line as final check ', err);
      throw err;
    }
  }
  async setOrderLineAsReceived(order, orderLine, userId, receiverId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.Recieved, userId, receiverId);
    } catch (err) {
      console.log('-> error on set order line as received ', err);
      throw err;
    }
  }

  async setOrderLineAsCanceled(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.Canceled, userId, warehouseId);
    } catch (err) {
      console.log('-> error on set order line as canceled ', err);
      throw err;
    }
  }

  async setOrderLineAsReturnRequested(order, orderLine, customerId, salesManagerId) {
    try {
      
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.ReturnRequested, customerId, salesManagerId);
    } catch (err) {
      console.log('-> error on set order line as cancel requested ', err);
      throw err;
    }
  }


  async setOrderAsWaitingForAggregation(order) {
    try {
      return this.setTicket(order, null, _const.ORDER_STATUS.WaitForAggregation, null, null, null, true);
    } catch (err) {
      console.log('-> ', 'error on set order as watining for aggregation');
      throw err;
    }
  }
  async setOrderAsDeliverySet(order, userId, warehouesId) {
    try {
      return this.setTicket(order, null, _const.ORDER_STATUS.DeliverySet, userId, warehouesId, null, true);
    } catch (err) {
      console.log('-> ', 'error on set order as watining for aggregation');
      throw err;
    }
  }

  async setOrderAsWaitForInvoice(order, userId, warehouseId) {
    try {

      return this.setTicket(order, null, _const.ORDER_STATUS.WaitForInvoice, userId, warehouseId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }
  async setOrderAsInvoiceVerified(order, userId, warehouseId) {
    try {

      return this.setTicket(order, null, _const.ORDER_STATUS.InvoiceVerified, userId, warehouseId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }

  async setOrderAsReadyToDeliver(order, userId, warehouseId) {
    try {

      return this.setTicket(order, null, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }

  async setOrderAsOnDelivery(order, userId) {
    try {

      return this.setTicket(order, null, _const.ORDER_STATUS.OnDelivery, userId, userId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }

  async setOrderAsDelivered(order, userId) {
    try {

      return this.setTicket(order, null, _const.ORDER_STATUS.Delivered, userId, userId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }
  async setOrderLineAsNotExists(order, order_line) {
    try {
      let salesManager = await new AgentModel(this.test).getSalesManager()
      if (!salesManager)
        throw error.salesManagerNotFound;

      await this.setTicket(order, order_line, _const.ORDER_LINE_STATUS.NotExists, null, salesManager._id)

      return Promise.resolve(salesManager);
    } catch (err) {
      console.log('-> ', 'error on set as not exists');
      throw err;
    }
  }

  async setOrderLineAsReserved(order, order_line, warehouse, renew = false) {

    try {
      let res = await new ProductModel(this.test).setInventory({
        id: order_line.product_id,
        productInstanceId: order_line.product_instance_id,
        warehouseId: warehouse._id,
        delReserved: 1
      });
      if (res && res.n === 1 && res.nModified === 1) {
        await this.setTicket(order, order_line, renew ? _const.ORDER_LINE_STATUS.Renew : _const.ORDER_LINE_STATUS.default, null, warehouse._id)
      } else {
        throw error.invalidInventoryCount;
      }
    } catch (err) {
      console.log('-> ', 'error on set order line as reserved');
      throw err;
    }
  }

  
  async getTickets(body) {
    try {

      if (!body.orderId)
        throw error.orderNotFound;

      let isOrder = !body.orderLineId;

      let orderId = body.orderId;
      let orderLineId = body.orderLineId;

      let query;
      if (isOrder) {
        query = [
          {
            $match: {
              _id: mongoose.Types.ObjectId(orderId)
            }
          },
          {
            $unwind: {
              path: '$tickets',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'agent',
              localField: 'tickets.agent_id',
              foreignField: '_id',
              as: 'agent'
            }
          },
          {
            $unwind: {
              path: '$agent',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'agent',
              localField: 'tickets.receiver_id',
              foreignField: '_id',
              as: 'agent_receiver'
            }
          },
          {
            $unwind: {
              path: '$agent_receiver',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'warehouse',
              localField: 'tickets.receiver_id',
              foreignField: '_id',
              as: 'warehouse_receiver'
            }
          },
          {
            $unwind: {
              path: '$warehouse_receiver',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              _id: '$_id',
              tickets: {
                $push: {
                  status: '$tickets.status',
                  timestamp: '$tickets.timestamp',
                  is_processed: '$tickets.is_processed',
                  agent: '$agent',
                  warehouse_receiver: '$warehouse_receiver',
                  agent_receiver: '$agent_receiver',
                }
              }
            }
          }
        ]
      } else {
        query = [
          {
            $match: {
              _id: mongoose.Types.ObjectId(orderId)
            }
          },
          {
            $unwind: {
              path: '$order_lines',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              'order_lines._id': mongoose.Types.ObjectId(orderLineId)
            }
          },
          {
            $unwind: {
              path: '$order_lines.tickets',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'agent',
              localField: 'order_lines.tickets.agent_id',
              foreignField: '_id',
              as: 'agent'
            }
          },
          {
            $unwind: {
              path: '$agent',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'agent',
              localField: 'order_lines.tickets.receiver_id',
              foreignField: '_id',
              as: 'agent_receiver'
            }
          },
          {
            $unwind: {
              path: '$agent_receiver',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'warehouse',
              localField: 'order_lines.tickets.receiver_id',
              foreignField: '_id',
              as: 'warehouse_receiver'
            }
          },
          {
            $unwind: {
              path: '$warehouse_receiver',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              _id: '$_id',
              tickets: {
                $push: {
                  status: '$order_lines.tickets.status',
                  timestamp: '$order_lines.tickets.timestamp',
                  is_processed: '$order_lines.tickets.is_processed',
                  agent: '$agent',
                  warehouse_receiver: '$warehouse_receiver',
                  agent_receiver: '$agent_receiver',
                }
              }
            }
          }
        ]

      }

      return this.OrderModel.aggregate(query)
    } catch (err) {
      console.log('-> error on get order tickets', err);
      throw err;
    }
  }

  async search(options, offset, limit, user) {

    try {

      if (![_const.ACCESS_LEVEL.ShopClerk, _const.ACCESS_LEVEL.HubClerk, _const.ACCESS_LEVEL.SalesManager].includes(user.access_level))
        throw error.noAccess;

      if (!user.warehouse_id)
        throw error.warehouseIdRequired;

      let search;

      const WarehouseModel = require('./warehouse.model');
      let hub = await new WarehouseModel(this.test).getHub();

      if ([_const.ACCESS_LEVEL.ShopClerk, _const.ACCESS_LEVEL.HubClerk].includes(user.access_level)) { // shop or hub views
        if (options && options.type === _const.LOGISTIC_SEARCH.Inbox) {
          search = this.searchInbox(user.warehouse_id, offset, limit);
        }
        if (options && options.type === _const.LOGISTIC_SEARCH.ScanInternalDelivery) {
          search = this.searchScanInternalDeliveryBox(user.warehouse_id, offset, limit, hub);
        }
        if (options && options.type === _const.LOGISTIC_SEARCH.ScanExternalDelivery) {
          search = this.searchScanExternalDeliveryBox(user.warehouse_id, offset, limit, hub);
        }
        if (options && options.type === _const.LOGISTIC_SEARCH.ScanToCustomerDelivery) {
          search = this.searchScanExternalDeliveryBox(user.warehouse_id, offset, limit, hub, true);
        }
        if (options && options.type === _const.LOGISTIC_SEARCH.ScanReturnDelivery) {
          if (user.access_level !== _const.ACCESS_LEVEL.HubClerk)
            throw error.noAccess;

          search = this.searchScanInternalReturnBox(user.warehouse_id, offset, limit, hub, true);
        }
      }
      else if (user.access_level === _const.ACCESS_LEVEL.SalesManager) {
        if (options && options.type === _const.LOGISTIC_SEARCH.OrdersHistory) {
          search = this.searchHistory(offset, limit, options);
        }
      }
      if (!search || !search.mainQuery || !search.countQuery)
        throw error.invalidSearchQuery;

      let result = await this.OrderModel.aggregate(search.mainQuery);
      let res = await this.OrderModel.aggregate(search.countQuery)
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
                _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
                _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled,
                _const.ORDER_LINE_STATUS.Delivered,
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
                _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
                _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled,
                _const.ORDER_LINE_STATUS.Delivered,
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

  searchScanInternalDeliveryBox(receiverId, offset, limit, hub) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          $and: [
            {
              is_cart: false
            },
            {
              transaction_id: {
                $ne: null
              }
            }
          ]
        }
      },
      {
        $addFields: {
          cmp_address: {
            $cmp: ['$address.warehouse_id', mongoose.Types.ObjectId(receiverId)] // comparision between destination id and last ticket receiver id
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
            'order_lines.cancel': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.Recieved,
                _const.ORDER_LINE_STATUS.DeliverySet,
                _const.ORDER_LINE_STATUS.FinalCheck,
                _const.ORDER_LINE_STATUS.ReadyToDeliver,
              ]
            }
          },
          ]
        }
      },
      {
        $match: {
          $or: [
            {
              $and: [ // cc order line which is in hub
                {'address.warehouse_id': {$exists: true}},
                {'last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}},
                {$and: [{'is_collect': {$exists: true}}, {'is_collect': {$eq: true}}]}
              ]
            },
            {
              $and: [ // cc order line which is neither in hub or its destination
                {'address.warehouse_id': {$exists: true}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
                {'cmp_address': {$ne: 0}},
                {$and: [{'is_collect': {$exists: true}}, {'is_collect': {$eq: true}}]}
              ]
            },
            {
              $and: [ // not cc order line which is not in hub
                {'address.warehouse_id': {$exists: false}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
                {'is_collect': {$eq: false}}
              ]
            }
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
          order_time: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
          cmp_address: '$cmp_address',
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
        $addFields: {
          cmp_address: {
            $cmp: ['$address.warehouse_id', mongoose.Types.ObjectId(receiverId)] // comparision between destination id and last ticket receiver id
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
            'order_lines.cancel': false
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.Recieved,
                _const.ORDER_LINE_STATUS.DeliverySet,
                _const.ORDER_LINE_STATUS.FinalCheck,
                _const.ORDER_LINE_STATUS.ReadyToDeliver,
              ]
            }
          }]
        }
      },
      {
        $match: {
          $or: [
            {
              $and: [ // cc order line which is in hub
                {'address.warehouse_id': {$exists: true}},
                {'last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}},
                {$and: [{'is_collect': {$exists: true}}, {'is_collect': {$eq: true}}]}

              ]
            },
            {
              $and: [ // cc order line which is neither in hub or its destination
                {'address.warehouse_id': {$exists: true}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
                {'cmp_address': {$ne: 0}},
                {$and: [{'is_collect': {$exists: true}}, {'is_collect': {$eq: true}}]}
              ]
            },
            {
              $and: [ // not cc order line which is not in hub
                {'address.warehouse_id': {$exists: false}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
                {'is_collect': {$eq: false}}
              ]
            }
          ]
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }

  searchScanInternalReturnBox(receiverId, offset, limit, hub) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          $and: [
            {
              is_cart: false
            },
            {
              transaction_id: {
                $ne: null
              }
            }
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
            'order_lines.cancel': true
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.DeliverySet,
                _const.ORDER_LINE_STATUS.FinalCheck,
                _const.ORDER_LINE_STATUS.ReadyToDeliver,
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
          order_time: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
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
            'order_lines.cancel': true
          },
          {
            'last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'last_ticket.status': {
              $in: [
                _const.ORDER_LINE_STATUS.DeliverySet,
                _const.ORDER_LINE_STATUS.FinalCheck,
                _const.ORDER_LINE_STATUS.ReadyToDeliver,
              ]
            }
          }]
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }

  searchScanExternalDeliveryBox(receiverId, offset, limit, hub, isCC = false) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    let validOrderTickets = [
      _const.ORDER_STATUS.WaitForInvoice,
      _const.ORDER_STATUS.InvoiceVerified,
      _const.ORDER_STATUS.ReadyToDeliver
    ]

    if (isCC)
      validOrderTickets.push(_const.ORDER_STATUS.WaitForAggregation)
    else
      validOrderTickets = validOrderTickets.concat([
        _const.ORDER_STATUS.WaitForAggregation,
        _const.ORDER_STATUS.DeliverySet
      ])


    let validOrderLineTickets = [
      _const.ORDER_LINE_STATUS.Recieved,
      _const.ORDER_LINE_STATUS.FinalCheck,
      _const.ORDER_LINE_STATUS.Checked
    ];

    if (isCC)
      validOrderLineTickets.push(_const.ORDER_LINE_STATUS.ReadyToDeliver);



    result.mainQuery = [
      {
        $match: {
          $and: [
            {
              is_cart: false
            },
            {
              transaction_id: {
                $ne: null
              }
            }
          ]
        }
      },
      {
        $addFields: {
          'last_ticket': {
            $arrayElemAt: ["$tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'order_lines.cancel': false
          },
          {
            'last_ticket.status': {
              $in: validOrderTickets
            }
          }]
        }
      },
      {
        $addFields: {
          cmp_address: {
            $cmp: ['$address.warehouse_id', mongoose.Types.ObjectId(receiverId)] // comparision between destination id and last ticket receiver id
          }
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
          'ol_last_ticket': {
            $arrayElemAt: ["$order_lines.tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'ol_last_ticket.is_processed': false
          },
          {
            'ol_last_ticket.receiver_id': {
              $eq: mongoose.Types.ObjectId(receiverId)
            }
          },
          {
            'ol_last_ticket.status': {
              $in: validOrderLineTickets
            }
          }]
        }
      },
      {
        $match: {
          $or: [
            {
              $and: [ // cc order line which is its destination
                {'address.warehouse_id': {$exists: true}},
                {'cmp_address': {$eq: 0}},
                {$and: [{'is_collect': {$exists: true}}, {'is_collect': {$eq: true}}]}
              ]
            },
            {
              $and: [ // not cc order line which is in hub
                {'address.warehouse_id': {$exists: false}},
                {'ol_last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}},
                {'is_collect': {$eq: false}}
              ]
            }
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
          order_time: 1,
          order_line_id: '$order_lines._id',
          adding_time: '$order_lines.adding_time',
          tickets: '$tickets',
          ol_tickets: '$order_lines.tickets',
          product_colors: '$product.colors',
          total_order_lines: '$total_order_lines',
          customer: '$customer',
          address: '$address',
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
          _id: '$_id',
          order_time: {
            $first: '$order_time'
          },
          total_order_lines: {
            $first: '$total_order_lines'
          },
          customer: {
            $first: '$customer'
          },
          address: {
            $first: '$address'
          },
          tickets: {
            $first: '$tickets'
          },
          order_lines: {
            $push:
            {
              _id: '$order_line_id',
              instance: '$instance',
              product_colors: '$product_colors',
              tickets: '$ol_tickets',
              adding_time: '$adding_time'
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
    ];

    result.countQuery = [
      {
        $match: {
          $and: [
            {
              is_cart: false
            },
            {
              transaction_id: {
                $ne: null
              }
            }
          ]
        }
      },
      {
        $addFields: {
          'last_ticket': {
            $arrayElemAt: ["$tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [{
            'last_ticket.is_processed': false
          },
          {
            'order_lines.cancel': false
          },
          {
            'last_ticket.status': {
              $in: validOrderTickets
            }
          }]
        }
      },
      {
        $addFields: {
          cmp_address: {
            $cmp: ['$address.warehouse_id', mongoose.Types.ObjectId(receiverId)] // comparision between destination id and last ticket receiver id

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
              $in: validOrderLineTickets
            }
          }]
        }
      },
      {
        $match: {
          $or: [
            {
              $and: [ // cc order line which is its destination
                {'address.warehouse_id': {$exists: true}},
                {'cmp_address': {$eq: 0}},
                {$and: [{'is_collect': {$exists: true}}, {'is_collect': {$eq: true}}]}
              ]
            },
            {
              $and: [ // not cc order line which is in hub
                {'address.warehouse_id': {$exists: false}},
                {'last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}},
                {'is_collect': {$eq: false}}
              ]
            }
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }

  searchHistory(offset, limit, options) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    let preQuery = [
      {
        $match: {
          $and: [{
            is_cart: false
          },
          {
            transaction_id: {
              $ne: null
            }
          }]
        }
      },
      {
        $addFields: {
          'last_ticket': {
            $arrayElemAt: ["$tickets", -1]
          }
        }
      }
    ];

    if (options && options.transId) {
      preQuery[0]['$match']['$and'].push(
        {transaction_id: new RegExp('.*' + options.transId + '.*', 'i')},
      );
    }

    if (options && options.receiver) {
      preQuery[0]['$match']['$and'].push(
        {
          $or: [
            {'address.recipient_name': new RegExp('.*' + options.receiver + '.*', 'i')},
            {'address.recipient_surname': new RegExp('.*' + options.receiver + '.*', 'i')},
            {'address.recipient_national_id': new RegExp('.*' + options.receiver + '.*')},
          ]
        }
      );
    }

    if (options && options.orderTime) {

      let date1 = moment(moment(options.orderTime).format('YYYY-MM-DD'), 'YYYY-MM-DD').toDate();
      let date2 = moment(moment(options.orderTime).add(1, 'd').format('YYYY-MM-DD'), 'YYYY-MM-DD').toDate();
      preQuery[0]['$match']['$and'].push(
        {
          $and: [
            {order_time: {$gte: date1}},
            {order_time: {$lt: date2}},
          ]
        },
      );
    }

    if (options && options.status) {

      preQuery.push({
        $match: {
          'last_ticket.status': {$eq: options.status}
        }
      })

    }

    result.mainQuery = [...preQuery,
    ...[
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
        $addFields: {
          'last_ol_ticket': {
            $arrayElemAt: ["$order_lines.tickets", -1]
          }
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
          ol_tickets: '$order_lines.tickets',
          cancel: '$order_lines.cancel',
          product_colors: '$product.colors',
          total_order_lines: '$total_order_lines',
          customer: '$customer',
          address: '$address',
          tickets: '$tickets',
          transaction_id: '$transaction_id',
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
          _id: '$_id',
          order_time: {
            $first: '$order_time'
          },
          total_order_lines: {
            $first: '$total_order_lines'
          },
          customer: {
            $first: '$customer'
          },
          address: {
            $first: '$address'
          },
          transaction_id: {
            $first: '$transaction_id'
          },
          tickets: {
            $first: '$tickets'
          },
          order_lines: {
            $push:
            {
              _id: '$order_line_id',
              instance: '$instance',
              product_colors: '$product_colors',
              adding_time: '$adding_time',
              tickets: '$ol_tickets',
              cancel: '$cancel'
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
    ];

    result.countQuery = [...preQuery,
    ...[
      {
        $count: 'count'
      }
    ]
    ];

    return result;

  }

  getDeliveryAgentOrderLines(receiverId, isExternal = false, isExternalReturn = false) {
    return this.OrderModel.aggregate([
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
              $eq: isExternal && !isExternalReturn ? _const.ORDER_LINE_STATUS.Checked : _const.ORDER_LINE_STATUS.ReadyToDeliver
            }
          }]
        }
      },
      {
        $project: {
          _id: '$_id',
          order_line_id: '$order_lines._id',
        }
      }
    ])
  }

  getRemainder(receiverId, tickets, is_collect = false) {
    return this.OrderModel.aggregate([
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
}


module.exports = Ticket;
