const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const _const = require('./const.list');

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
      if (delivery.from && delivery.from.warehouse_id) {
        return this.setTicket(delivery, _const.DELIVERY_STATUS.requestPackage, userId, userId);
      } else if (delivery.from && delivery.from.customer) {

      }
      else
        throw error.invalidDeliveryInfo
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
        search = this.getDeliveryItems(user.warehouse_id, offset, limit, options)
      }


      if (!search || !search.mainQuery || !search.countQuery)
        throw error.invalidSearchQuery;

      let result = await this.DeliveryModel.aggregate(search.mainQuery);
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
          last_ticket: '$last_ticket',
          order_line: '$order.order_lines',
          product_colors: '$product.colors',
          expire_date: '$expire_date',
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
            }
          },
          transaction_id: {$first: '$transaction_id'},
          order_time: {$first: '$order_time'},
          customer: {$first: '$customer',},
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
    let conditions = [];
    // if (user.access_level === _const.ACCESS_LEVEL.SalesManager)
    //   conditions = [true];
    //  else return Promise.reject(errors.noAccess);

    if (user.access_level === _const.ACCESS_LEVEL.ShopClerk) {
      // conditions = [{'from.warehouse_id': {$exists: true}}, {'to.warehouse_id': {$exists: true}}, {'is_return': false}];
      // else if ()
      conditions = [{'from.warehouse_id': {$exists: true}}, {'to.customer': {$exists: true}}, {'is_return': false}];

    }

    if (user.access_level === _const.ACCESS_LEVEL.HubClerk) {
      conditions = [{'from.warehouse_id': {$exists: true}}, {'to.customer': {$exists: true}}, {'is_return': false}];
    }

    if (body.hasOwnProperty('endDate') && body.endDate) {
      conditions = conditions.concat([{'end': {$lte: new Date(moment(body.endDate).format('YYYY-MM-DD'))}}]);
    }

    let isDeliveredMatching = {};

    if (body.hasOwnProperty('isDelivered')) {
      if (body.isDelivered === false)
        isDeliveredMatching = {
          $or: [{'delivery_end': {$exists: false}}, {
            $and: [{
              'delivery_end': {$exists: true},
              'delivery_end': null
            }]
          }]
        }
      else if (body.isDelivered === true)
        isDeliveredMatching = {'delivery_end': {$exists: true}}, {'delivery_end': {$ne: null}};
    }


    let nameMatching = [];
    if (body.hasOwnProperty('transferee') && body.transferee) {
      nameMatching.push({
        $or: [
          {$and: [{'is_return': true}, {'from.customer._id': {$exists: true}}, {'from_customer_name': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}]},
          {$and: [{'is_return': false}, {'to.customer._id': {$exists: true}}, {'to_customer_name': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}]},
          {$and: [{'is_return': false}, {'to.customer._id': {$exists: false}}, {'to_warehouse_name': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}]}
        ]
      });
    }

    if (body.hasOwnProperty('agentName') && body.agentName) {
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

    let queryResult = [];

    let result = {
      mainQuery: [],
      countQuery: []
    };

    result.mainQuery = [
      // {
      //   $match: {$and: conditions}
      // },
      // {
      //   $addFields: {'last_status': {"$arrayElemAt": ["$status_list", -1]}}
      // },
      {
        $match: isDeliveredMatching
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
          path: '$from_customer.addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {'from_adr_id_cmp': {$cmp: ['$from.customer.address._id', '$from_customer.addresses._id']}}
      },
      {
        $match: {
          from_adr_id_cmp: 0,
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
        $group: {
          _id: '$_id',
          from: {
            $first: {
              customer: {
                first_name: '$from_customer.first_name',
                surname: '$from_customer.surname',
                username: '$from_customer.username',
                address: '$from_customer.addresses',
                _id: '$from_customer._id'
              },
              warehouse: '$from_warehouse'
            }
          },
          to: {$first: '$to'},
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          order_details: {$first: '$order_details'},
          delivery_agent: {$first: '$delivery_agent'},
          min_end: {$first: '$min_end'},
          min_slot: {$first: '$min_slot'},
        }
      },
      {
        $project: {
          _id: 1,
          processed_by: 1,
          from: 1,
          from_customer_name: {$toLower: {$concat: ['$from.customer.first_name' + ' ' + '$from.customer.surname']}},
          to: 1,
          shelf_code: 1,
          is_return: 1,
          start: 1,
          end: 1,
          delivery_start: 1,
          delivery_end: 1,
          order_details: 1,
          delivery_agent: 1,
          min_end: 1,
          min_slot: 1,
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
        $unwind: {
          path: '$to_customer.addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {'to_adr_id_cmp': {$cmp: ['$to.customer.address._id', '$to_customer.addresses._id']}}
      },
      {
        $match: {
          to_adr_id_cmp: 0,
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
                address: '$to_customer.addresses',
                _id: '$to_customer._id'
              },
              warehouse: '$to_warehouse'
            }
          },
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          order_details: {$first: '$order_details'},
          min_end: {$first: '$min_end'},
          min_slot: {$first: '$min_slot'},
        }
      },
      {
        $project: {
          _id: 1,
          delivery_agent: 1,
          from: 1,
          from_customer_name: 1,
          to: 1,
          to_customer_name: {$toLower: {$concat: ['$to.customer.first_name', ' ', '$to.customer.surname']}},
          agent_name: {$toLower: {$concat: ['$delivery_agent.first_name', ' ', '$delivery_agent.surname']}},
          to_warehouse_name: {$toLower: '$to.warehouse.name'},
          shelf_code: 1,
          is_return: 1,
          start: 1,
          end: 1,
          delivery_start: 1,
          delivery_end: 1,
          order_details: 1,
          is_delivered: {
            $cond: [
              {$not: ['$delivery_end']},
              1,
              0
            ]
          },
          min_end: 1,
          min_slot: 1,
        }
      },
      {
        $match: nameMatching
      },
      {
        $sort: sortOption
      },
      {
        $group: {
          '_id': null,
          result: {$push: '$$ROOT'},
          total: {$sum: 1}
        }
      },
      {
        $project: {
          total: 1,
          result: {
            $slice: ['$result', Number.parseInt(offset), Number.parseInt(limit)]
          }
        }
      }

    ];

    result.countQuery = [
      // {
      //   $match: {$and: conditions}
      // },
      // {
      //   $addFields: {'last_status': {"$arrayElemAt": ["$status_list", -1]}}
      // },
      {
        $match: isDeliveredMatching
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
          path: '$from_customer.addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {'from_adr_id_cmp': {$cmp: ['$from.customer.address_id', '$from_customer.addresses._id']}}
      },
      {
        $match: {
          from_adr_id_cmp: 0,
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
        $group: {
          _id: '$_id',
          from: {
            $first: {
              customer: {
                first_name: '$from_customer.first_name',
                surname: '$from_customer.surname',
                username: '$from_customer.username',
                address: '$from_customer.addresses',
                _id: '$from_customer._id'
              },
              warehouse: '$from_warehouse'
            }
          },
          to: {$first: '$to'},
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          order_details: {$first: '$order_details'},
          delivery_agent: {$first: '$delivery_agent'},
          min_end: {$first: '$min_end'},
          min_slot: {$first: '$min_slot'},
        }
      },
      {
        $project: {
          _id: 1,
          processed_by: 1,
          from: 1,
          from_customer_name: {$toLower: {$concat: ['$from.customer.first_name' + ' ' + '$from.customer.surname']}},
          to: 1,
          shelf_code: 1,
          is_return: 1,
          start: 1,
          end: 1,
          delivery_start: 1,
          delivery_end: 1,
          order_details: 1,
          delivery_agent: 1,
          min_end: 1,
          min_slot: 1,
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
        $unwind: {
          path: '$to_customer.addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {'to_adr_id_cmp': {$cmp: ['$to.customer.address._id', '$to_customer.addresses._id']}}
      },
      {
        $match: {
          to_adr_id_cmp: 0,
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
                address: '$to_customer.addresses',
                _id: '$to_customer._id'
              },
              warehouse: '$to_warehouse'
            }
          },
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          order_details: {$first: '$order_details'},
          min_end: {$first: '$min_end'},
          min_slot: {$first: '$min_slot'},
        }
      },
      {
        $project: {
          _id: 1,
          delivery_agent: 1,
          from: 1,
          from_customer_name: 1,
          to: 1,
          to_customer_name: {$toLower: {$concat: ['$to.customer.first_name', ' ', '$to.customer.surname']}},
          agent_name: {$toLower: {$concat: ['$delivery_agent.first_name', ' ', '$delivery_agent.surname']}},
          to_warehouse_name: {$toLower: '$to.warehouse.name'},
          shelf_code: 1,
          is_return: 1,
          start: 1,
          end: 1,
          delivery_start: 1,
          delivery_end: 1,
          order_details: 1,
          is_delivered: {
            $cond: [
              {$not: ['$delivery_end']},
              1,
              0
            ]
          },
          min_end: 1,
          min_slot: 1,
        }
      },
      {
        $match: nameMatching
      },
      {
        $sort: sortOption
      },
      {
        $group: {
          '_id': null,
          result: {$push: '$$ROOT'},
          total: {$sum: 1}
        }
      },
      {
        $project: {
          total: 1,
          result: {
            $slice: ['$result', Number.parseInt(offset), Number.parseInt(limit)]
          }
        }
      }

    ];

    return result;
  }
  
}


module.exports = DeliveryTicket;
