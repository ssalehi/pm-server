
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


  async setOrderLineAsWatingForOnlineWarehouse(order, orderLine, userId, warehouseId) {
    try {
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse, userId, warehouseId);
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
      return this.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.ReadyToDeliver, userId, receiverId);
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

      this.setTicket(order, null, _const.ORDER_STATUS.WaitForInvoice, userId, warehouseId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }
  async setOrderAsInvoiceVerified(order, userId, warehouseId) {
    try {

      this.setTicket(order, null, _const.ORDER_STATUS.InvoiceVerified, userId, warehouseId, null, true);

    } catch (err) {
      console.log('-> error on set order lines as aggregated');
      throw err;
    }
  }
  async setOrderAsReadyToDeliver(order, userId, warehouseId) {
    try {

      this.setTicket(order, null, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId, null, true);

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
      })
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



  async search(options, offset, limit, user) {

    try {

      if (![_const.ACCESS_LEVEL.ShopClerk, _const.ACCESS_LEVEL.HubClerk].includes(user.access_level))
        throw error.noAccess;

      if (!user.warehouse_id)
        throw error.warehouseIdRequired;

      let search;

      const WarehouseModel = require('./warehouse.model');
      let hub = await new WarehouseModel(this.test).getHub();


      if (options && options.type === _const.LOGISTIC_SEARCH.Inbox) {
        search = this.searchInbox(user.warehouse_id, offset, limit);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.ScanInternalDelivery) {
        search = this.searchScanInternalDeliveryBox(user.warehouse_id, offset, limit, hub);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.ScanExternalDelivery) {
        search = this.searchScanExternalDeliveryBox(user.warehouse_id, offset, limit, hub);
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
            $cmp: ['$address.warehouse_id', receiverId] // comparision between destination id and last ticket receiver id
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
                _const.ORDER_LINE_STATUS.Recieved,
                _const.ORDER_LINE_STATUS.FinalCheck
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
                {'last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}}
              ]
            },
            {
              $and: [ // cc order line which is neither in hub or its destination
                {'address.warehouse_id': {$exists: true}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
                {'cmp_address': {$ne: 0}},
              ]
            },
            {
              $and: [ // not cc order line which is not in hub
                {'address.warehouse_id': {$exists: false}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
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
        $addFields: {
          cmp_address: {
            $cmp: ['$address.warehouse_id', receiverId] // comparision between destination id and last ticket receiver id
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
                _const.ORDER_LINE_STATUS.Recieved,
                _const.ORDER_LINE_STATUS.FinalCheck
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
                {'last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}}
              ]
            },
            {
              $and: [ // cc order line which is neither in hub or its destination
                {'address.warehouse_id': {$exists: true}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
                {'cmp_address': {$ne: 0}},
              ]
            },
            {
              $and: [ // not cc order line which is not in hub
                {'address.warehouse_id': {$exists: false}},
                {'last_ticket.receiver_id': {$ne: mongoose.Types.ObjectId(hub._id)}},
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

   searchScanExternalDeliveryBox(receiverId, offset, limit, hub) {
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
            $cmp: ['$address.warehouse_id', receiverId] // comparision between destination id and last ticket receiver id
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
              $in: [
                _const.ORDER_LINE_STATUS.Recieved,
                _const.ORDER_LINE_STATUS.FinalCheck,
              ]
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
              ]
            },
            {
              $and: [ // not cc order line which is in hub
                {'address.warehouse_id': {$exists: false}},
                {'ol_last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}},
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
            $cmp: ['$address.warehouse_id', receiverId] // comparision between destination id and last ticket receiver id
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
                _const.ORDER_LINE_STATUS.Recieved,
                _const.ORDER_LINE_STATUS.FinalCheck
              ]
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
              ]
            },
            {
              $and: [ // not cc order line which is in hub
                {'address.warehouse_id': {$exists: false}},
                {'last_ticket.receiver_id': {$eq: mongoose.Types.ObjectId(hub._id)}},
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

    if (!mongoose.Types.ObjectId.isValid(params.orderId) ||
      !mongoose.Types.ObjectId.isValid(params.orderLineId)) {
      return Promise.reject(error.invalidId);
    }
    return this.OrderModel.aggregate([{
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

    if (!mongoose.Types.ObjectId.isValid(params.orderId)) {
      return Promise.reject(error.invalidId);
    }
    return this.OrderModel.aggregate([{
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
                $eq: ['$order_line.tickets.receiver_id', user.id]
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

  getInternalDeliveryAgentOrderLines(userId) {
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
              $eq: mongoose.Types.ObjectId(userId)
            }
          },
          {
            'last_ticket.status': {
              $eq: _const.ORDER_LINE_STATUS.ReadyToDeliver
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
}


module.exports = Ticket;
