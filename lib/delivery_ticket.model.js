const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const _const = require('./const.list');
const moment = require('moment');

class DeliveryTicket extends Base {

  constructor(test) {
    super('Delivery', test);
    this.test = test;
    this.DeliveryModel = this.model;
  }

  closeCurrentTicket(delivery, userId) {

    let query = {
      _id: delivery._id
    }

    return this.DeliveryModel.update(query, {
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


  async addNewTicket(delivery, status, receiverId) {

    if (!receiverId)
      return Promise.reject(error.ticketReceiverRequired)

    let query = {
      '_id': mongoose.Types.ObjectId(delivery._id),
    };

    let update = {
      'status': status,
      'receiver_id': mongoose.Types.ObjectId(receiverId)
    };

    let newTicketUpdate = {
      '$addToSet': {
        'tickets': update
      }
    };

    let res = await this.DeliveryModel.findOneAndUpdate(query, newTicketUpdate, {
      new: true
    }).lean();

    return Promise.resolve(res);
  }

  async setTicket(delivery, status, userId, receiverId) {
    try {

      if (!delivery)
        throw error.deliveryNotFound;

      const lastTicket = (delivery.tickets && delivery.tickets.length ? delivery.tickets[delivery.tickets.length - 1] : null)


      if (lastTicket && !lastTicket.is_processed && lastTicket.status === status)
        return Promise.resolve();

      if (!Object.values(_const.DELIVERY_STATUS).find(x => x === status))
        throw error.invalidTicket;


      let newDelivery = await this.closeCurrentTicket(delivery, userId);
      if (receiverId)
        return this.addNewTicket(delivery, status, receiverId);
      else
        return Promise.resolve(newDelivery);
    } catch (err) {
      console.log('-> erron on set delivery ticket ', err);
      throw err;
    }
  }

  async setDeliveryAsDefault(delivery, receiverId, agentId = null) {
    try {
      return this.setTicket(delivery, _const.DELIVERY_STATUS.default, agentId, receiverId)

    } catch (err) {
      console.log('-> error on set delivery as default ', err);
      throw err;
    }
  }

  async setDeliveryAsAgentSet(delivery, userId, receiverId) {
    try {

      return this.setTicket(delivery, _const.DELIVERY_STATUS.agentSet, userId, receiverId);
    } catch (err) {
      console.log('-> error on set delivery as agent set', err);
      throw err;
    }
  }

  async setDeliveryAsRequestPackage(delivery, userId) {

    try {
      return this.setTicket(delivery, _const.DELIVERY_STATUS.requestPackage, userId, userId);
    } catch (err) {
      console.log('-> error on set delivery as request package', err);
      throw err;
    }

  }

  async setDeliveryAsStarted(delivery, userId) {

    try {
      return this.setTicket(delivery, _const.DELIVERY_STATUS.started, userId, userId);
    } catch (err) {
      console.log('-> error on set delivery as request package', err);
      throw err;
    }

  }

  async setDeliveryAsEnded(delivery, userId, receiverId) {

    try {
      return this.setTicket(delivery, _const.DELIVERY_STATUS.ended, userId, receiverId);
    } catch (err) {
      console.log('-> error on set delivery as request package', err);
      throw err;
    }

  }


  async search(options, offset, limit, user) {

    try {
      let search;

      if (options && options.type === _const.LOGISTIC_SEARCH.InternalUnassignedDelivery) {
        if (!user.warehouse_id)
          return Promise.reject(error.ticketReceiverRequired);

        search = this.searchInternalUnAssigned(user.warehouse_id, offset, limit);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.InternalAssignedDelivery) {
        search = this.searchInternalAssignedDelivery(user.id);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.OnDelivery) {
        search = this.searchOnDelivery(user.id);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.ExternalUnassignedDelivery) {
        search = this.searchExternalUnassignedDelivery(user.id);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.AgentFinishedDelivery) {
        search = this.searchAgentFinishedDelivery(user.id);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.ShelvesList) {
        if (!user.warehouse_id)
          return Promise.reject(error.ticketReceiverRequired);

        search = this.shelvesList(user.warehouse_id, offset, limit, options);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.DeliveryHistory) {
        search = this.getDeliveryItems(user, offset, limit, options)
      }


      if (!search || !search.mainQuery || !search.countQuery)
        throw error.invalidSearchQuery;

      let result = [];
      if (search.mainQuery && search.mainQuery.length) {
        result = await this.DeliveryModel.aggregate(search.mainQuery);
      }
      let totalCount = 0;
      if (search.countQuery && search.countQuery.length) {
        let res = await this.DeliveryModel.aggregate(search.countQuery)
        totalCount = res[0] ? res[0].count : 0;
      }
      return Promise.resolve({
        data: result,
        total: totalCount,
      });

    } catch (err) {
      console.log('-> error on search in delivery');
      throw err;
    }

  }

  searchInternalUnAssigned(receiverId, offset, limit) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          $and: [
            {
              "from.warehouse_id": {
                $eq: mongoose.Types.ObjectId(receiverId)
              }
            },
            {
              "to.customer": {$exists: false}
            }
          ]
        }
      },
      {
        $addFields: {
          'last_ticket': {
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
                $eq: _const.DELIVERY_STATUS.default,
              }
            }]
        }
      },
      {
        $lookup: {
          from: 'agent',
          localField: 'delivery_agent',
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
          from: 'warehouse',
          localField: 'to.warehouse_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      {
        $unwind: {
          path: '$warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: {
          'start': 1,
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
              "from.warehouse_id": {
                $eq: mongoose.Types.ObjectId(receiverId)
              }
            },
            {
              "to.customer": {$exists: false}
            }
          ]
        }
      },
      {
        $addFields: {
          'last_ticket': {
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
                $eq: _const.DELIVERY_STATUS.default,

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

  searchInternalAssignedDelivery(agentId) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          "delivery_agent": {
            $eq: mongoose.Types.ObjectId(agentId)
          }
        }
      },
      {
        $addFields: {
          'last_ticket': {
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
                $eq: mongoose.Types.ObjectId(agentId)
              }
            },
            {
              'last_ticket.status': {
                $in: [
                  _const.DELIVERY_STATUS.agentSet,
                  _const.DELIVERY_STATUS.requestPackage,
                ]
              }
            }]
        }
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $unwind: {
          path: '$order_details.order_line_ids',
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
          to: 1,
          from: 1,
          tickets: 1,
          start: 1,
          order_details: 1,
          last_ticket: '$last_ticket',
          order_line: '$order.order_lines',
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          cmp_value2: {
            $cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']
          },
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}
        }
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          from: {$first: '$from'},
          tickets: {$first: '$tickets'},
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          last_ticket: {$first: '$last_ticket'},
          order_details: {$push: '$order_details'},
          order_lines: {
            $push: {
              paid_price: '$order_line.paid_price',
              _id: '$order_line._id',
              tickets: '$order_line.tickets',
              instance: '$instance',
              product_color: '$product_colors'
            }

          }
        }
      },
      {
        $sort: {
          'start': 1,
        }
      }
    ];

    return result;
  }

  searchExternalUnassignedDelivery(agentId) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          $or: [
            {'to.customer': {$exists: true}},
            {'from.customer': {$exists: true}}
          ]
        }
      },
      {
        $addFields: {
          'last_ticket': {
            "$arrayElemAt": ["$tickets", -1]
          }
        }
      },
      {
        $match: {
          $and: [
            {
              'last_ticket.is_processed': false
            },
            {
              $or: [
                {
                  'last_ticket.status': {
                    $eq: _const.DELIVERY_STATUS.default,
                  }
                },
                {
                  $and: [
                    {
                      'last_ticket.status': {
                        $in: [
                          _const.DELIVERY_STATUS.agentSet,
                          _const.DELIVERY_STATUS.requestPackage,
                        ]
                      }
                    },
                    {
                      'last_ticket.receiver_id': {
                        $eq: mongoose.Types.ObjectId(agentId),
                      }
                    }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $match: {
          'order.tickets.status': {
            $eq: _const.ORDER_STATUS.DeliverySet
          }
        }
      },
      {
        $unwind: {
          path: '$order.order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details.order_line_ids',
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
          to_customer: 1,
          to: 1,
          from_customer: 1,
          from: 1,
          start: 1,
          tickets: 1,
          order_details: 1,
          order: 1,
          last_ticket: 1,
          order_line: '$order.order_lines',
          product_colors: '$product.colors',
          expire_date: 1,
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          cmp_value2: {
            $cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']
          },
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}
        }
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          to_customer: {$first: '$to_customer.addresses'},
          from: {$first: '$from'},
          from_customer: {$first: '$from_customer.addresses'},
          tickets: {$first: '$tickets'},
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          last_ticket: {$first: '$last_ticket'},
          order_details: {$push: '$order_details'},
          orders: {$push: '$order'},
          order_lines: {
            $push: {
              paid_price: '$order_line.paid_price',
              _id: '$order_line._id',
              tickets: '$order_line.tickets',
              instance: '$instance',
              product_color: '$product_colors'
            }
          }
        }
      },
      {
        $addFields: {
          'orig_order_size': {$size: '$order_details'},
          'ready_order_size': {$size: '$orders'}
        }
      },
      {
        $addFields: {
          cmp_value3: {
            $cmp: ['$orig_order_size', '$ready_order_size']
          }
        }
      },
      {
        $match: {
          cmp_value3: {$eq: 0}
        }
      },
      {
        $sort: {
          'start': 1,
        }
      }
    ];
    return result;
  }

  searchOnDelivery(agentId) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          "delivery_agent": {
            $eq: mongoose.Types.ObjectId(agentId)
          }
        }
      },
      {
        $addFields: {
          'last_ticket': {
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
                $eq: mongoose.Types.ObjectId(agentId)
              }
            },
            {
              'last_ticket.status': {
                $eq: _const.DELIVERY_STATUS.started
              }
            }]
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $unwind: {
          path: '$order_details.order_line_ids',
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
          to: 1,
          to_customer: 1,
          from: 1,
          from_customer: 1,
          start: 1,
          delivery_start: 1,
          tickets: 1,
          order_details: 1,
          last_ticket: '$last_ticket',
          order_line: '$order.order_lines',
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          cmp_value2: {
            $cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']
          },
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}
        }
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          to_customer: {$first: '$to_customer.addresses'},
          from: {$first: '$from'},
          from_customer: {$first: '$from_customer.addresses'},
          tickets: {$first: '$tickets'},
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          last_ticket: {$first: '$last_ticket'},
          order_details: {$push: '$order_details'},
          order_lines: {
            $push: {
              paid_price: '$order_line.paid_price',
              _id: '$order_line._id',
              tickets: '$order_line.tickets',
              instance: '$instance',
              product_color: '$product_colors'
            }

          }
        }
      },
      {
        $sort: {
          'start': 1,
        }
      }
    ];

    return result;
  }

  searchAgentFinishedDelivery(agentId) {
    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: {
          $and: [
            {
              "delivery_agent": {
                $eq: mongoose.Types.ObjectId(agentId)
              }
            },
            {
              "delivery_end": {$exists: true}
            }
          ]

        }
      },
      {
        $addFields: {
          'last_ticket': {
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
              'last_ticket.status': {
                $eq: _const.DELIVERY_STATUS.ended
              }
            }]
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $unwind: {
          path: '$order_details.order_line_ids',
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
          to: 1,
          to_customer: 1,
          from: 1,
          from_customer: 1,
          tickets: 1,
          start: 1,
          expire_date: 1,
          delivery_start: 1,
          delivery_end: 1,
          order_details: 1,
          last_ticket: '$last_ticket',
          order_line: '$order.order_lines',
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          cmp_value2: {
            $cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']
          },
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}
        }
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          to_customer: {$first: '$to_customer.addresses'},
          from: {$first: '$from'},
          from_customer: {$first: '$from_customer.addresses'},
          tickets: {$first: '$tickets'},
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          last_ticket: {$first: '$last_ticket'},
          order_details: {$push: '$order_details'},
          order_lines: {
            $push: {
              paid_price: '$order_line.paid_price',
              _id: '$order_line._id',
              tickets: '$order_line.tickets',
              instance: '$instance',
              product_color: '$product_colors'
            }

          }
        }
      },
      {
        $sort: {
          'start': 1,
        }
      }
    ];

    return result;
  }

  shelvesList(receiverId, offset, limit, body) {

    let nameMatching = [];
    if (body.hasOwnProperty('transferee') && body.transferee) {
      nameMatching.push({
        $or: [
          {$and: [{'to.customer.address': {$exists: true}}, {'recipient': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}]},
          {$and: [{'to.warehouse_id': {$exists: true}}, {'to_warehouses': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}]},

        ]
      });
    }

    if (body.hasOwnProperty('shelfCodes') && body.shelfCodes) {
      nameMatching.push({'shelf_code': new RegExp('.*' + body.shelfCodes.toUpperCase() + '.*')});
    }

    if (!nameMatching.length) {
      nameMatching = {};
    }
    else
      nameMatching = {$and: nameMatching};


    const result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $addFields: {
          'last_ticket': {
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
                $in: [
                  _const.DELIVERY_STATUS.default,
                  _const.DELIVERY_STATUS.agentSet,
                  _const.DELIVERY_STATUS.requestPackage,
                ]
              }
            }]
        }
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details.order_line_ids',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $addFields: {
          'total_order_lines': {
            $size: '$order.order_lines'
          }
        }
      },
      {
        $unwind: {
          path: '$order.order_lines',
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
          from: 'warehouse',
          localField: 'to.warehouse_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      {
        $unwind: {
          path: '$warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          order_details: 1,
          order_id: '$order._id',
          to: '$to',
          shelf_code: '$shelf_code',
          order_line_id: '$order.order_lines._id',
          order_time: '$order.order_time',
          transaction_id: '$order.transaction_id',
          last_ticket: '$last_ticket',
          customer: {
            '_id': '$customer._id',
            'first_name': '$customer.first_name',
            'surname': '$customer.surname',
          },
          address: {
            '_id': '$order.address._id',
            'recipient_name': '$order.address.recipient_name',
            'recipient_surname': '$order.address.recipient_surname',
          },
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          recipient: {$toLower: {$concat: ['$order.address.recipient_name', ' ', '$order.address.recipient_surname']}},
          to_warehouses: {$toLower: ['$warehouse.name']},
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']},
          cmp_value2: {$cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']},
        },
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $match: nameMatching
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          order_details: {
            $push: {
              _id: '$order_details._id',
              order_id: '$order_details.order_id',
              order_line_ids: '$order_details.order_line_ids'
            }
          },
          shelf_code: {$first: '$shelf_code'},
          order_lines: {
            $push: {
              order_lines_id: '$order_line_id',
              product_colors: '$product_colors',
              instance: '$instance',
              total_order_lines: '$total_order_lines',
              transaction_id: '$transaction_id',
              order_time: '$order_time',
            }
          },
          customer: {$first: '$customer'},
          address: {$first: '$address'},
          last_ticket: {$first: '$last_ticket'},
          count: {
            $sum: 1
          },
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
        $addFields: {
          'last_ticket': {
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
                $in: [
                  _const.DELIVERY_STATUS.default,
                  _const.DELIVERY_STATUS.agentSet,
                  _const.DELIVERY_STATUS.requestPackage,
                ]
              }
            }]
        }
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $addFields: {
          'total_order_lines': {
            $size: '$order_details.order_line_ids'
          }
        }
      },
      {
        $unwind: {
          path: '$order_details.order_line_ids',
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
        $project: {
          _id: 1,
          order_id: '$order._id',
          to: '$to',
          shelf_code: '$shelf_code',
          order_line_id: '$order.order_lines._id',
          last_ticket: '$last_ticket',
          total_order_lines: '$total_order_lines',
          customer: {
            '_id': '$customer._id',
            'first_name': '$customer.first_name',
            'surname': '$customer.surname',
          },
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          cmp_value2: {
            $cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']
          },
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}
        },
      },
      {
        $match: nameMatching
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
        }
      },
      {
        $count: 'count'
      }
    ];

    return result;
  }

  getDeliveryItems(user, offset, limit, body) {

    if ((body.isInternal && body.transferee) || (!body.Isinternal && body.fromWarehouse && body.toWarehouse))
      return {
        mainQuery: [],
        countQuery: []
      };

    let conditions = [];

    if (user.access_level === _const.ACCESS_LEVEL.ShopClerk) {
      conditions = [{'from.warehouse_id': {$eq: mongoose.Types.ObjectId(user.warehouse_id)}}];
    }

    if (user.access_level === _const.ACCESS_LEVEL.HubClerk) {
      conditions.push({
        $or: [
          {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(user.warehouse_id)}},
          {'from.customer._id': {$exists: true}},
        ]
      })
    }

    if (!conditions.length)
      conditions = {};
    else
      conditions = {$and: conditions};

    // Internal and external delivery matching filter
    let DeliveryMatching = [];

    if (body.isInternal) {
      DeliveryMatching = [{'from.warehouse._id': {$exists: true}}, {'to.warehouse._id': {$exists: true}}]
    }
    else if (body.isInternal === false) {
      DeliveryMatching.push({
        $or: [
          {'to.customer.address': {$exists: true}},
          {'from.customer._id': {$exists: true}},
        ]
      });
    }
    else if (body.isInternal === null)
      DeliveryMatching = {};

    if (!DeliveryMatching.length)
      DeliveryMatching = {};
    else
      DeliveryMatching = {$and: DeliveryMatching};


    // From Warehouse matching
    let from_warehouseMatching = [];
    if (body.fromWarehouse) {
      from_warehouseMatching = [{'from.warehouse._id': {$eq: mongoose.Types.ObjectId(body.fromWarehouse)}}];
    }

    if (!from_warehouseMatching.length)
      from_warehouseMatching = {};
    else
      from_warehouseMatching = {$and: from_warehouseMatching};

    // to Warehouse matching
    let to_warehouseMatching = [];
    if (body.toWarehouse) {
      to_warehouseMatching = [{'to.warehouse._id': {$eq: mongoose.Types.ObjectId(body.toWarehouse)}}];
    }

    if (!to_warehouseMatching.length)
      to_warehouseMatching = {};
    else
      to_warehouseMatching = {$and: to_warehouseMatching};


    // Time matching
    let timeMatching = [];
    if (body.startDateSearch) {
      let date1 = moment(moment(body.startDateSearch).format('YYYY-MM-DD')).set({
        'hour': '00',
        'minute': '00',
        'second': '00'
      }).toDate();

      let date2 = moment(moment(body.startDateSearch).format('YYYY-MM-DD')).set({
        'hour': '24',
        'minute': '00',
        'second': '00'
      }).toDate();
      timeMatching.push({
        $and: [
          {delivery_start: {$gte: date1}},
          {delivery_start: {$lt: date2}},
        ]
      })
    }

    if (!timeMatching.length)
      timeMatching = {};
    else
      timeMatching = {$and: timeMatching};


    // IsDelivered Matching
    let isDeliveredMatching = {};
    if (body.isDelivered) {
      isDeliveredMatching = [{'delivery_start': {$exists: true}}, {'delivery_start': {$ne: null}}];
    }
    else if (body.isDelivered === false) {
      isDeliveredMatching = [{'delivery_start': {$exists: true}}, {'delivery_start': {$eq: null}}];
    }
    else if (body.isDelivered === null) {
      isDeliveredMatching = [{'delivery_start': {$exists: true}}];
    }

    if (!isDeliveredMatching.length)
      isDeliveredMatching = {};
    else
      isDeliveredMatching = {$and: isDeliveredMatching};


    // name matching for search
    let nameMatching = [];
    if (body.recipient) {
      nameMatching.push({
          $or: [
            {'toRecipientName': new RegExp('.*' + body.recipient.toLowerCase() + '.*')},
            {'toCustomerName': new RegExp('.*' + body.recipient.toLowerCase() + '.*')}
          ]
        }
      );
    }

    if (body.sender) {
      nameMatching.push({
        $and: [{'from.customer._id': {$exists: true}},
          {
            $or: [
              {'from_customer_name': new RegExp('.*' + body.sender.toLowerCase() + '.*')},
              {'from_customer_national_id': new RegExp('.*' + body.sender.toLowerCase() + '.*')}
            ]
          },
        ]
      });
    }

    if (body.transferee) {
      nameMatching.push({
        $and: [{'to.customer': {$exists: true}},
          {
            $or: [
              {'to_recipient': new RegExp('.*' + body.transferee.toLowerCase() + '.*')},
              {'to_recipient_national_id': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}
            ]
          },
        ]
      });
    }

    if (body.agentName) {
      nameMatching.push({'agent_name': new RegExp('.*' + body.agentName.toLowerCase() + '.*')});
    }

    if (!nameMatching.length)
      nameMatching = {};
    else
      nameMatching = {$and: nameMatching};

    let sortOption = {};
    if (body.sort_column && body.direction) {
      const direction = body.direction === 'asc' ? 1 : -1;

      if (body.sort_column === 'name') {
        sortOption = {
          'from_customer_name': direction,
          'to_customer_name': direction,
          'to.warehouse.name': direction,
        }
      } else
        sortOption[body.sort_column] = direction;
    } else
      sortOption = {_id: 1};
    let result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      {
        $match: conditions
      },
      {
        $addFields: {'last_ticket': {"$arrayElemAt": ["$tickets", -1]}}
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details.order_line_ids',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $lookup: {
          from: 'customer',
          localField: 'order.customer_id',
          foreignField: '_id',
          as: 'customerName'
        }
      },
      {
        $unwind: {
          path: '$customerName',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'warehouse',
          localField: 'from.warehouse_id',
          foreignField: '_id',
          as: 'from_warehouse'
        }
      },
      {
        $unwind: {
          path: '$from_warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          order_details: 1,
          to: 1,
          from: 1,
          shelf_code: '$shelf_code',
          last_ticket: '$last_ticket',
          customer: {
            '_id': '$from_customer._id',
            'first_name': '$from_customer.first_name',
            'surname': '$from_customer.surname',
          },
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          order_line_id: '$order.order_lines._id',
          transaction_id: '$order.transaction_id',
          order_time: '$order.order_time',
          from_customer_name: {$toLower: {$concat: ['$from_customer.first_name', ' ', '$from_customer.surname']}},
          from_customer_national_id: '$from.customer.address.recipient_national_id',
          from_warehouse_name: {$toLower: '$from_warehouse.name'},
          toRecipientName: {$toLower: {$concat: ['$order.address.recipient_name', ' ', '$order.address.recipient_surname']},},
          toCustomerName: {$toLower: {$concat: ['$customerName.first_name', ' ', '$customerName.surname']},},
          is_return: 1,
          start: 1,
          delivery_start: 1,
          delivery_end: 1,
          delivery_agent: 1,
          order_lines: 1,
          from_customer: '$from_customer',
          from_warehouse: '$from_warehouse',
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']},
          cmp_value2: {$cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']},
        },
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          from: {
            $first: {
              customer: {
                first_name: '$from_customer.first_name',
                surname: '$from_customer.surname',
                username: '$from_customer.username',
                address: '$from_customer.address',
                _id: '$from_customer._id'
              },
              warehouse: '$from_warehouse'
            }
          },
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          delivery_agent: {$first: '$delivery_agent'},
          order_details: {
            $push: {
              _id: '$order_details._id',
              order_id: '$order_details.order_id',
              order_line_ids: '$order_details.order_line_ids'
            }
          },
          order_lines: {
            $push: {
              order_lines_id: '$order_line_id',
              product_colors: '$product_colors',
              instance: '$instance',
              total_order_lines: '$total_order_lines',
              transaction_id: '$transaction_id',
              order_time: '$order_time',
              toCustomerName: '$toCustomerName',
              toRecipientName: '$toRecipientName',
            }
          },
          last_ticket: {$first: '$last_ticket'},
          from_customer_name: {$first: '$from_customer_name'},
          from_customer_national_id: {$first: '$from_customer_national_id'},
          from_warehouse_name: {$first: '$from_warehouse_name'},
          toCustomerName: {$first: '$toCustomerName'},
          toRecipientName: {$first: '$toRecipientName'},
          count: {
            $sum: 1
          },
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'warehouse',
          localField: 'to.warehouse_id',
          foreignField: '_id',
          as: 'to_warehouse'
        }
      },
      {
        $unwind: {
          path: '$to_warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'agent',
          localField: 'delivery_agent',
          foreignField: '_id',
          as: 'sender_agent',
        }
      },
      {
        $unwind: {
          path: '$sender_agent',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          order_id: '$order._id',
          to: '$to',
          from: '$from',
          shelf_code: '$shelf_code',
          last_ticket: '$last_ticket',
          customer: {
            '_id': '$to_customer._id',
            'first_name': '$to_customer.first_name',
            'surname': '$to_customer.surname',
          },
          to_recipient: {$toLower: {$concat: ['$to.customer.address.recipient_name', ' ', '$to.customer.address.recipient_surname']}},
          to_recipient_national_id: {$toLower: '$to.customer.address.recipient_national_id'},
          agent_name: {$toLower: {$concat: ['$sender_agent.first_name', ' ', '$sender_agent.surname']}},
          to_warehouse_name: {$toLower: '$to_warehouse.name'},
          sender_agent: 1,
          from_customer_name: 1,
          from_warehouse_name: 1,
          from_customer_national_id: 1,
          is_return: 1,
          start: 1,
          delivery_start: 1,
          delivery_end: 1,
          order_lines: 1,
          order_details: 1,
          to_warehouse: '$to_warehouse',
          to_customer: '$to_customer',
          recipient: {$concat: ['$to.customer.address.recipient_name', ' ', '$to.customer.address.recipient_surname']},
          toCustomerName: 1,
          toRecipientName: 1,
        },
      },
      {
        $group: {
          _id: '$_id',
          delivery_agent: {
            $first: {
              first_name: '$sender_agent.first_name',
              surname: '$sender_agent.surname',
              username: '$sender_agent.username',
              _id: '$sender_agent._id',
            }
          },
          from: {$first: '$from'},
          to: {
            $first: {
              customer: {
                first_name: '$to_customer.first_name',
                surname: '$to_customer.surname',
                username: '$to_customer.username',
                address: '$to.customer.address',
                _id: '$to_customer._id'
              },
              warehouse: '$to_warehouse'
            }
          },
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          last_ticket: {$first: '$last_ticket'},
          order_details: {$first: '$order_details'},
          order_lines: {$first: '$order_lines'},
          from_customer_name: {$first: '$from_customer_name'},
          from_customer_national_id: {$first: '$from_customer_national_id'},
          from_warehouse_name: {$first: '$from_warehouse_name'},
          to_recipient: {$first: '$recipient'},
          to_recipient_national_id: {$first: '$to_recipient_national_id'},
          to_warehouse_name: {$first: '$to_warehouse.name'},
          agent_name: {$first: '$agent_name'},
          toCustomerName: {$first: '$order_lines.toCustomerName'},
          toRecipientName: {$first: '$order_lines.toRecipientName'},
          count: {
            $sum: 1
          },
        }
      },
      {
        $sort: {
          'order_time': 1,
        }
      },
      {
        $match: nameMatching
      },
      {
        $match: timeMatching
      },
      {
        $match: DeliveryMatching
      },
      {
        $match: isDeliveredMatching
      },
      {
        $match: from_warehouseMatching
      },
      {
        $match: to_warehouseMatching
      },
      {
        $sort: sortOption
      },
      {
        $skip: Number.parseInt(offset),

      },
      {
        $limit: Number.parseInt(limit),
      }
    ];

    result.countQuery = [
      {
        $match: conditions
      },
      {
        $addFields: {'last_ticket': {"$arrayElemAt": ["$tickets", -1]}}
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$order_details.order_line_ids',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'order',
          localField: 'order_details.order_id',
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
        $lookup: {
          from: 'customer',
          localField: 'order.customer_id',
          foreignField: '_id',
          as: 'customerName'
        }
      },
      {
        $unwind: {
          path: '$customerName',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'warehouse',
          localField: 'from.warehouse_id',
          foreignField: '_id',
          as: 'from_warehouse'
        }
      },
      {
        $unwind: {
          path: '$from_warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          order_details: 1,
          to: 1,
          from: 1,
          customer: {
            '_id': '$from_customer._id',
            'first_name': '$from_customer.first_name',
            'surname': '$from_customer.surname',
          },
          product_colors: '$product.colors',
          instance: {
            '_id': '$product.instances._id',
            'product_id': '$product._id',
            'product_name': '$product.name',
            'barcode': '$product.instances.barcode',
            'size': '$product.instances.size',
            'product_color_id': '$product.instances.product_color_id'
          },
          order_line_id: '$order.order_lines._id',
          transaction_id: '$order.transaction_id',
          order_time: '$order.order_time',
          from_customer_name: {$toLower: {$concat: ['$from_customer.first_name', ' ', '$from_customer.surname']}},
          from_customer_national_id: '$from.customer.address.recipient_national_id',
          from_warehouse_name: {$toLower: '$from_warehouse.name'},
          toRecipientName: {$toLower: {$concat: ['$order.address.recipient_name', ' ', '$order.address.recipient_surname']},},
          toCustomerName: {$toLower: {$concat: ['$customerName.first_name', ' ', '$customerName.surname']},},
          start: 1,
          delivery_start: 1,
          delivery_agent: 1,
          order_lines: 1,
          from_customer: '$from_customer',
          from_warehouse: '$from_warehouse',
          cmp_value1: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']},
          cmp_value2: {$cmp: ['$order.order_lines.product_instance_id', '$product.instances._id']},
        },
      },
      {
        $match: {
          $and: [
            {cmp_value1: {$eq: 0}},
            {cmp_value2: {$eq: 0}}
          ]
        }
      },
      {
        $group: {
          _id: '$_id',
          to: {$first: '$to'},
          from: {
            $first: {
              customer: {
                first_name: '$from_customer.first_name',
                surname: '$from_customer.surname',
                username: '$from_customer.username',
                address: '$from_customer.address',
                _id: '$from_customer._id'
              },
              warehouse: '$from_warehouse'
            }
          },
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          delivery_agent: {$first: '$delivery_agent'},
          order_details: {
            $push: {
              _id: '$order_details._id',
              order_id: '$order_details.order_id',
              order_line_ids: '$order_details.order_line_ids'
            }
          },
          order_lines: {
            $push: {
              order_lines_id: '$order_line_id',
              product_colors: '$product_colors',
              instance: '$instance',
              total_order_lines: '$total_order_lines',
              transaction_id: '$transaction_id',
              order_time: '$order_time',
              toCustomerName: '$toCustomerName',
              toRecipientName: '$toRecipientName',
            }
          },
          from_customer_name: {$first: '$from_customer_name'},
          from_customer_national_id: {$first: '$from_customer_national_id'},
          from_warehouse_name: {$first: '$from_warehouse_name'},
          toCustomerName: {$first: '$toCustomerName'},
          toRecipientName: {$first: '$toRecipientName'},
          count: {
            $sum: 1
          },
        }
      },
      {
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'warehouse',
          localField: 'to.warehouse_id',
          foreignField: '_id',
          as: 'to_warehouse'
        }
      },
      {
        $unwind: {
          path: '$to_warehouse',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'agent',
          localField: 'delivery_agent',
          foreignField: '_id',
          as: 'sender_agent',
        }
      },
      {
        $unwind: {
          path: '$sender_agent',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          order_id: '$order._id',
          to: '$to',
          from: '$from',
          customer: {
            '_id': '$to_customer._id',
            'first_name': '$to_customer.first_name',
            'surname': '$to_customer.surname',
          },
          to_recipient: {$toLower: {$concat: ['$to.customer.address.recipient_name', ' ', '$to.customer.address.recipient_surname']}},
          to_recipient_national_id: {$toLower: '$to.customer.address.recipient_national_id'},
          agent_name: {$toLower: {$concat: ['$sender_agent.first_name', ' ', '$sender_agent.surname']}},
          to_warehouse_name: {$toLower: '$to_warehouse.name'},
          sender_agent: 1,
          from_customer_name: 1,
          from_warehouse_name: 1,
          from_customer_national_id: 1,
          start: 1,
          delivery_start: 1,
          order_lines: 1,
          order_details: 1,
          to_warehouse: '$to_warehouse',
          to_customer: '$to_customer',
          toCustomerName: 1,
          toRecipientName: 1,
        },
      },
      {
        $group: {
          _id: '$_id',
          delivery_agent: {
            $first: {
              first_name: '$sender_agent.first_name',
              surname: '$sender_agent.surname',
              username: '$sender_agent.username',
              _id: '$sender_agent._id',
            }
          },
          from: {$first: '$from'},
          to: {
            $first: {
              customer: {
                first_name: '$to_customer.first_name',
                surname: '$to_customer.surname',
                username: '$to_customer.username',
                address: '$to.customer.address',
                _id: '$to_customer._id'
              },
              warehouse: '$to_warehouse'
            }
          },
          start: {$first: '$start'},
          delivery_start: {$first: '$delivery_start'},
          order_details: {$first: '$order_details'},
          order_lines: {$first: '$order_lines'},
          from_customer_name: {$first: '$from_customer_name'},
          from_customer_national_id: {$first: '$from_customer_national_id'},
          from_warehouse_name: {$first: '$from_warehouse_name'},
          to_recipient: {$first: '$recipient'},
          to_recipient_national_id: {$first: '$to_recipient_national_id'},
          to_warehouse_name: {$first: '$to_warehouse.name'},
          agent_name: {$first: '$agent_name'},
          toCustomerName: {$first: '$order_lines.toCustomerName'},
          toRecipientName: {$first: '$order_lines.toRecipientName'},
          count: {
            $sum: 1
          },
        }
      },
      {
        $sort: {
          'order_time': 1,
        }
      },
      {
        $match: nameMatching
      },
      {
        $match: timeMatching
      },
      {
        $match: DeliveryMatching
      },
      {
        $match: isDeliveredMatching
      },
      {
        $match: from_warehouseMatching
      },
      {
        $match: to_warehouseMatching
      },
      {
        $sort: sortOption
      },
      {
        $count: 'count'
      }
    ];
    console.log('result:::::', result);
    return result;
  }
}


module.exports = DeliveryTicket;
