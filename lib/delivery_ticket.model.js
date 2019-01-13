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
          {$and: [{'to.customer.address_id': {$exists: true}}, {'recipient': new RegExp('.*' + body.transferee.toLowerCase() + '.*')}]},
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
    if (!user.access_level === _const.ACCESS_LEVEL.SalesManager) {
      return Promise.reject(errors.noAccess);
    }

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
      {
        $match: {$and: conditions}
      },
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
        $addFields: {'to_adr_id_cmp': {$cmp: ['$to.customer.address_id', '$to_customer.addresses._id']}}
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
      {
        $match: {$and: conditions}
      },
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
        $addFields: {'to_adr_id_cmp': {$cmp: ['$to.customer.address_id', '$to_customer.addresses._id']}}
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

  // updateDelivery(user, body) {
  //   if (!body._id)
  //     return Promise.reject(errors.deliveryIdIsRequired);
  //
  //   const updateObj = {};
  //
  //   if (body.delivery_agent_id)
  //     updateObj['delivery_agent'] = body.delivery_agent_id;
  //
  //   if (body.start)
  //     updateObj['start'] = body.start;
  //
  //   if (body.end)
  //     updateObj['end'] = body.end;
  //
  //   if (!Object.keys(updateObj).length)
  //     return Promise.resolve('nothing to save');
  //
  //   updateObj['completed_by'] = user.id;
  //   let deliveryObj = {};
  //
  //   return this.DeliveryModel.findOne({
  //     _id: body._id,
  //   })
  //     .then(res => {
  //       if (res.delivery_start)
  //         return Promise.reject('cannot change');
  //
  //       return this.DeliveryModel.findOneAndUpdate({
  //         _id: body._id,
  //       }, {
  //         $set: updateObj,
  //       }, {
  //         new: true,
  //       });
  //     })
  //     .then(res => {
  //       if (!mongoose.Types.ObjectId.isValid(res.delivery_agent) || !res.start)
  //         return Promise.resolve([]);
  //
  //       deliveryObj = res;
  //       let promiseList = [];
  //
  //       let orderIds = res.order_details.map(el => el.order_id);
  //       let orderLineIds = res.order_details.map(el => el.order_line_ids).reduce((a, b) => a.concat(b), []);
  //
  //       return models()['Order' + (Delivery.test ? 'Test' : '')].aggregate([
  //         {
  //           $match: {'_id': {$in: orderIds}}
  //         },
  //         {
  //           $unwind: {
  //             path: '$order_lines',
  //             preserveNullAndEmptyArrays: true
  //           }
  //         },
  //         {
  //           $match: {'order_lines._id': {$in: orderLineIds}},
  //         }
  //       ]);
  //     })
  //     .then(res => {
  //       if (!res || !res.length)
  //         return Promise.resolve([]);
  //
  //       let ticket = new Ticket(Delivery.test);
  //       let promiseList = [];
  //
  //       res.forEach(el => {
  //         promiseList.push(ticket.setTicket(el, el.order_lines, _const.ORDER_STATUS.DeliverySet, user.id, mongoose.Types.ObjectId(deliveryObj.delivery_agent)));
  //       });
  //
  //       return Promise.all(promiseList);
  //     })
  //     .then(res => {
  //       if (!res || !res.length)
  //         return Promise.resolve([]);
  //
  //       return this.DeliveryModel.update({
  //         _id: body._id,
  //       }, {
  //         $addToSet: {
  //           'status_list': {
  //             status: _const.ORDER_STATUS.DeliverySet
  //           }
  //         },
  //       });
  //     });
  // }

  // initiate(order, orderLineId, from, to) {
  //   const fromCondition = from.customer && from.customer._id ? {'from.customer._id': {$eq: mongoose.Types.ObjectId(from.customer._id)}} : {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(from.warehouse_id)}};
  //   const toCondition = to.customer && to.customer._id ? {'to.customer._id': {$eq: mongoose.Types.ObjectId(to.customer._id)}} : {'to.warehouse_id': {$eq: mongoose.Types.ObjectId(to.warehouse_id)}};
  //
  //   return this.DeliveryModel.findOne({
  //     $and: [
  //       {$or: [{start: {$exists: false}}, {start: {$eq: null}}]},
  //       {$or: [{end: {$exists: false}}, {end: {$eq: null}}]},
  //       {$or: [{delivery_start: {$exists: false}}, {delivery_start: {$eq: null}}]},
  //       {$or: [{delivery_end: {$exists: false}}, {delivery_end: {$eq: null}}]},
  //       fromCondition,
  //       toCondition,
  //     ]
  //   }).lean()
  //     .then(res => {
  //       if (res) {
  //         // Update current delivery
  //         const foundOrder = res.order_details.find(o => o.order_id.toString() === order._id.toString());
  //
  //         if (foundOrder)
  //           foundOrder.order_line_ids.push(mongoose.Types.ObjectId(orderLineId));
  //         else {
  //           res.order_details = res.order_details.concat([{
  //             order_id: mongoose.Types.ObjectId(order._id),
  //             order_line_ids: [mongoose.Types.ObjectId(orderLineId)],
  //           }]);
  //
  //           const orderEndDate = order.duration_days ? moment(order.order_time, 'YYYY-MM-DD').add(order.duration_days, 'days') : null;
  //
  //           if (orderEndDate) {
  //             if (moment(orderEndDate, 'YYYY-MM-DD').isBefore(moment(res.min_end, 'YYYY-MM-DD'))) {
  //               res.min_end = orderEndDate;
  //               res.min_slot = order.time_slot;
  //             } else if (moment(orderEndDate, 'YYYY-MM-DD').isSame(moment(res.min_end, 'YYYY-MM-DD'))) {
  //               // Calculate min_slot and min_end properties
  //
  //               if (!res.min_slot && order.time_slot) {
  //                 res.min_slot = {
  //                   upper_bound: order.time_slot.upper_bound,
  //                   lower_bound: order.time_slot.lower_bound,
  //                 };
  //               } else if (res.min_slot && order.time_slot) {
  //                 res.min_slot = {
  //                   upper_bound: order.time_slot.upper_bound < res.min_slot.upper_bound ? order.time_slot.upper_bound : res.min_slot.upper_bound,
  //                   lower_bound: order.time_slot.lower_bound < res.min_slot.lower_bound ? order.time_slot.lower_bound : res.min_slot.lower_bound,
  //                 };
  //               }
  //             }
  //           }
  //         }
  //       } else {
  //         // Should add new delivery
  //         res = {};
  //         res.order_details = [
  //           {
  //             order_id: mongoose.Types.ObjectId(order._id),
  //             order_line_ids: [mongoose.Types.ObjectId(orderLineId)],
  //           }
  //         ];
  //
  //         res.from = from;
  //         res.to = to;
  //         res.min_slot = order.time_slot;
  //         res.min_end = order.duration_days ? moment(order.order_time, 'YYYY-MM-DD').add(order.duration_days, 'days') : null;
  //         res.status_list = [];
  //       }
  //
  //       return this.DeliveryModel.findOneAndUpdate(
  //         {
  //           _id: mongoose.Types.ObjectId(res._id),
  //         }, {
  //           $set: {
  //             order_details: res.order_details,
  //             from: res.from,
  //             to: res.to,
  //             min_slot: res.min_slot,
  //             min_end: res.min_end,
  //             status_list: res.status_list,
  //           }
  //         }, {
  //           new: true,
  //           upsert: true,
  //         });
  //     });
  // }
  //
  // getDeliveryData(delivery_id) {
  //   return this.DeliveryModel.aggregate([
  //     {
  //       $match: {
  //         '_id': mongoose.Types.ObjectId(delivery_id)
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'warehouse',
  //         localField: 'to.warehouse_id',
  //         foreignField: '_id',
  //         as: 'to_warehouse'
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'customer',
  //         localField: 'to.customer._id',
  //         foreignField: '_id',
  //         as: 'to_customer'
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'warehouse',
  //         localField: 'from.warehouse_id',
  //         foreignField: '_id',
  //         as: 'from_warehouse'
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'customer',
  //         localField: 'from.customer._id',
  //         foreignField: '_id',
  //         as: 'from_customer'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_customer',
  //         preserveNullAndEmptyArrays: true,
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_customer',
  //         preserveNullAndEmptyArrays: true,
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_warehouse',
  //         preserveNullAndEmptyArrays: true,
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_warehouse',
  //         preserveNullAndEmptyArrays: true,
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_customer.addresses',
  //         preserveNullAndEmptyArrays: true,
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_customer.addresses',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $project: {
  //         order_details: '$order_details',
  //         to: {
  //           customer: '$to_customer',
  //           customer_address_id: '$to.customer.address_id',
  //           warehouse: '$to_warehouse'
  //         },
  //         from: {
  //           customer: '$from_customer',
  //           customer_address_id: '$from.customer.address_id',
  //           warehouse: '$from_warehouse'
  //         },
  //         cmp_value1: {$cmp: ['$to.customer.address_id', '$to_customer.addresses._id']},
  //         cmp_value2: {$cmp: ['$from.customer.address_id', '$from_customer.addresses._id']},
  //         start: '$start',
  //         end: '$end',
  //         delivery_start: '$delivery_start',
  //         delivery_end: '$delivery_end',
  //         shelf_code: '$shelf_code',
  //         is_return: '$is_return',
  //         delivered_evidence: '$delivered_evidence',
  //         status_list: '$status_list',
  //         min_end: '$min_end',
  //         min_slot: '$min_slot',
  //       }
  //     },
  //     {
  //       $match: {
  //         $and: [
  //           {cmp_value1: {$eq: 0}},
  //           {cmp_value2: {$eq: 0}}
  //         ]
  //       }
  //     },
  //     {
  //       $project: {
  //         order_details: '$order_details',
  //         to: '$to',
  //         from: '$from',
  //         start: '$start',
  //         end: '$end',
  //         delivery_start: '$delivery_start',
  //         delivery_end: '$delivery_end',
  //         shelf_code: '$shelf_code',
  //         is_return: '$is_return',
  //         delivered_evidence: '$delivered_evidence',
  //         status_list: '$status_list',
  //         min_end: '$min_end',
  //         min_slot: '$min_slot',
  //       }
  //     }
  //   ]);
  // }
  //
  // makeDeliveryShelfCode(delivery_Id) {
  //   let hub_id;
  //   let delivery;
  //   return new Warehouse(Delivery.test).getHub().then(res => {
  //     hub_id = res[0]._id;
  //     return this.DeliveryModel.aggregate([
  //       {
  //         $match: {
  //           $and: [
  //             {'delivery_end': {$exists: false}}
  //           ]
  //         }
  //       },
  //     ]);
  //   }).then((res) => {
  //     delivery = res.find(d => d._id.toString() === delivery_Id.toString());
  //     res = res.filter(d => d.shelf_code).map(d => d.shelf_code).sort();
  //     let shelfCodeValue = "";
  //     if (delivery && delivery.shelf_code)
  //       return Promise.resolve({
  //         shelf_code: delivery.shelf_code,
  //         exist: true,
  //       });
  //     else if (!delivery)
  //       return Promise.reject('There is no delivery with this id');
  //     if (!res.find(d => d === "AA"))
  //       shelfCodeValue = "AA";
  //     for (let i = 0; i < res.length; i++) {
  //       let d = res[i];
  //       let firstChar = String.fromCharCode(d.charCodeAt(1) + 1);
  //       let secondChar = String.fromCharCode(d.charCodeAt(0));
  //       if (firstChar > "Z") {
  //         firstChar = "A";
  //         secondChar = String.fromCharCode(d.charCodeAt(0) + 1)
  //       }
  //       if (!res.find(d => d === (secondChar + firstChar))) {
  //         shelfCodeValue = secondChar + firstChar;
  //         break;
  //       }
  //     }
  //
  //     return this.DeliveryModel.findOneAndUpdate({
  //       _id: mongoose.Types.ObjectId(delivery._id),
  //     }, {
  //       $set: {
  //         shelf_code: shelfCodeValue,
  //       }
  //     }, {
  //       new: true,
  //     })
  //       .then(res => {
  //         if (!res)
  //           return Promise.reject('There is not delivery with this id');
  //
  //         return Promise.resolve({
  //           shelf_code: res.shelf_code,
  //           exist: false,
  //         });
  //       });
  //   });
  // }
  //
  // getDeliveryAgentItems(user, isDelivered, deliveryStatus, isProcessed = false) {
  //   if (!deliveryStatus)
  //     return Promise.reject(errors.deliveryStatusIsRequired);
  //
  //   let condition = [{'delivery_agent': mongoose.Types.ObjectId(user.id)}];
  //
  //   if (isDelivered !== null && isDelivered !== undefined) {
  //     if (isDelivered) {
  //       // should fetch delivered items
  //       condition.push({'delivery_end': {$ne: null}});
  //     } else {
  //       // should fetch not-delivered items
  //       condition.push(
  //         {
  //           $or: [
  //             {'delivery_end': {$exists: false}},
  //             {'delivery_end': {$eq: null}}
  //           ]
  //         }
  //       );
  //     }
  //   }
  //
  //   let secondConditionPart = [{'last_status.status': deliveryStatus}];
  //
  //   if (isDelivered && !isProcessed && deliveryStatus === _const.ORDER_STATUS.Delivered) {
  //     condition = condition.concat([
  //       {'to.customer._id': {$exists: true}},
  //       {'to.customer._id': {$ne: null}}
  //     ]);
  //   }
  //
  //   if (isDelivered && isProcessed && deliveryStatus === _const.ORDER_STATUS.Delivered) {
  //     secondConditionPart.push({
  //       $or: [
  //         {
  //           $and: [
  //             {
  //               $or: [
  //                 {'to.customer._id': {$exists: true}},
  //                 {'to.customer._id': {$ne: null}},
  //               ]
  //             },
  //             {'last_status.is_processed': isProcessed},
  //           ]
  //         },
  //         {
  //           $and: [
  //             {'to.warehouse_id': {$exists: true}},
  //             {'to.warehouse_id': {$ne: null}},
  //           ]
  //         }
  //       ]
  //     });
  //   } else
  //     secondConditionPart.push({'last_status.is_processed': isProcessed});
  //
  //   // Should fetch items and related addresses and status_list (to sure these delivery items should passed to delivery agent to deliver)
  //   return this.DeliveryModel.aggregate([
  //     {
  //       $match: {$and: condition}
  //     },
  //     {
  //       $addFields: {'last_status': {"$arrayElemAt": ["$status_list", -1]}}
  //     },
  //     {
  //       $match: {
  //         $and: secondConditionPart
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'customer',
  //         localField: 'from.customer._id',
  //         foreignField: '_id',
  //         as: 'from_customer'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_customer',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_customer.addresses',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $addFields: {'from_adr_id_cmp': {$cmp: ['$from.customer.address_id', '$from_customer.addresses._id']}}
  //     },
  //     {
  //       $match: {
  //         from_adr_id_cmp: 0,
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'warehouse',
  //         localField: 'from.warehouse_id',
  //         foreignField: '_id',
  //         as: 'from_warehouse'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_warehouse',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: '$_id',
  //         from: {
  //           $first: {
  //             customer: {
  //               first_name: '$from_customer.first_name',
  //               surname: '$from_customer.surname',
  //               username: '$from_customer.username',
  //               address: '$from_customer.addresses',
  //               _id: '$from_customer._id'
  //             },
  //             warehouse: '$from_warehouse'
  //           }
  //         },
  //         to: {$first: '$to'},
  //         start: {$first: '$start'},
  //         end: {$first: '$end'},
  //         delivery_start: {$first: '$delivery_start'},
  //         delivery_end: {$first: '$delivery_end'},
  //         delivery_agent: {$first: '$delivery_agent'},
  //         delivered_evidence: {$first: '$delivered_evidence'},
  //         min_end: {$first: '$min_end'},
  //         min_slot: {$first: '$min_slot'},
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'customer',
  //         localField: 'to.customer._id',
  //         foreignField: '_id',
  //         as: 'to_customer'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_customer',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_customer.addresses',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $addFields: {'to_adr_id_cmp': {$cmp: ['$to.customer.address_id', '$to_customer.addresses._id']}}
  //     },
  //     {
  //       $match: {
  //         to_adr_id_cmp: 0,
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'warehouse',
  //         localField: 'to.warehouse_id',
  //         foreignField: '_id',
  //         as: 'to_warehouse'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_warehouse',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: '$_id',
  //         delivery_agent: {
  //           $first: {
  //             first_name: '$sender_agent.first_name',
  //             surname: '$sender_agent.surname',
  //             username: '$sender_agent.username',
  //             _id: '$sender_agent._id',
  //           }
  //         },
  //         from: {$first: '$from'},
  //         to: {
  //           $first: {
  //             customer: {
  //               first_name: '$to_customer.first_name',
  //               surname: '$to_customer.surname',
  //               username: '$to_customer.username',
  //               address: '$to_customer.addresses',
  //               _id: '$to_customer._id'
  //             },
  //             warehouse: '$to_warehouse'
  //           }
  //         },
  //         start: {$first: '$start'},
  //         end: {$first: '$end'},
  //         delivery_start: {$first: '$delivery_start'},
  //         delivery_end: {$first: '$delivery_end'},
  //         delivered_evidence: {$first: '$delivered_evidence'},
  //         min_end: {$first: '$min_end'},
  //         min_slot: {$first: '$min_slot'},
  //       }
  //     }
  //   ]);
  // }
  //
  // changeStatus(user, body) {
  //   if (!body.delivery_ids)
  //     return Promise.reject(errors.targetDeliveryIdsAreRequired);
  //
  //   if (!body.target_status)
  //     return Promise.reject(errors.deliveryStatusIsRequired);
  //
  //   let promiseList = [];
  //
  //   body.delivery_ids.forEach(id => {
  //     promiseList.push(this.addStatus(id, user, body.target_status));
  //   });
  //
  //   return Promise.all(promiseList)
  //     .then(res => {
  //       if (body.target_status === _const.ORDER_STATUS.OnDelivery)
  //         return this.DeliveryModel.update(
  //           {
  //             _id: {$in: body.delivery_ids.map(el => mongoose.Types.ObjectId(el))},
  //           }, {
  //             $set: {
  //               delivery_start: new Date(),
  //             }
  //           }, {
  //             multi: true,
  //           })
  //
  //       return Promise.resolve();
  //     })
  // }
  //
  // addStatus(delivery_id, user, target_status) {
  //   let deliveryDetails = {};
  //   let orders = [];
  //
  //   return this.DeliveryModel.findOneAndUpdate(
  //     {
  //       _id: mongoose.Types.ObjectId(delivery_id),
  //     },
  //     {
  //       $set: {
  //         'status_list.$[i].is_processed': true,
  //         'status_list.$[i].agent_id': user.id,
  //       },
  //     },
  //     {
  //       new: true,
  //       arrayFilters: [
  //         {'i.is_processed': false},
  //       ]
  //     })
  //     .then(res => {
  //       return this.DeliveryModel.findOneAndUpdate(
  //         {
  //           _id: mongoose.Types.ObjectId(delivery_id),
  //         },
  //         {
  //           $addToSet: {
  //             'status_list': {
  //               status: target_status,
  //             }
  //           }
  //         },
  //         {
  //           new: true,
  //         });
  //     })
  //     .then(res => {
  //       deliveryDetails = res;
  //       let promiseList = [];
  //
  //       let orderIds = res.order_details.map(el => el.order_id);
  //       let orderLineIds = res.order_details.map(el => el.order_line_ids).reduce((a, b) => a.concat(b), []);
  //
  //       return models()['Order' + (Delivery.test ? 'Test' : '')].aggregate([
  //         {
  //           $match: {'_id': {$in: orderIds}}
  //         },
  //         {
  //           $unwind: {
  //             path: '$order_lines',
  //             preserveNullAndEmptyArrays: true
  //           }
  //         },
  //         {
  //           $match: {'order_lines._id': {$in: orderLineIds}},
  //         }
  //       ]);
  //     })
  //     .then(res => {
  //       orders = res;
  //       return new WarehouseModel(Delivery.test).getAll();
  //     })
  //     .then(res => {
  //       let ticket = new Ticket(Delivery.test);
  //       let promiseList = [];
  //
  //       orders.forEach(el => {
  //         const foundToWarehouse = deliveryDetails && deliveryDetails.to.warehouse_id ?
  //           res.find(w => w._id.toString() === deliveryDetails.to.warehouse_id.toString()) : null;
  //
  //         promiseList.push(ticket.setTicket(
  //           el,
  //           el.order_lines,
  //           target_status,
  //           user.id,
  //           target_status === _const.ORDER_STATUS.Delivered && foundToWarehouse ? foundToWarehouse._id : user.id,
  //         ));
  //       });
  //
  //       return Promise.all(promiseList);
  //     })
  // }
  //
  // finishDelivery(user, body) {
  //   if (!body._id)
  //     return Promise.reject(errors.deliveryIdIsRequired);
  //
  //   return this.DeliveryModel.findOneAndUpdate(
  //     {
  //       $and: [
  //         {_id: mongoose.Types.ObjectId(body._id)},
  //         {
  //           $or: [
  //             {'delivery_end': {$exists: false}},
  //             {'delivery_end': null},
  //           ]
  //         },
  //       ]
  //     },
  //     {
  //       $set: {
  //         delivery_end: new Date(),
  //       }
  //     }, {
  //       new: true,
  //     })
  //     .then(res => {
  //       return this.changeStatus(user, {
  //         delivery_ids: [body._id.toString()],
  //         target_status: _const.ORDER_STATUS.Delivered,
  //       });
  //     });
  // }
  //
  // setEvidence(body, file, delivery_evidence_id) {
  //   if (!body._id)
  //     return Promise.reject(errors.deliveryIdIsRequired);
  //
  //   if (!body.customer_id)
  //     return Promise.reject(errors.customerIdRequired);
  //
  //   return this.DeliveryModel.findOne({
  //     $and: [
  //       {_id: mongoose.Types.ObjectId(body._id)},
  //       {
  //         $or: [
  //           {'delivered_evidence': {$exists: false}},
  //           {'delivered_evidence': null}
  //         ]
  //       }
  //     ]
  //   })
  //     .then(res => {
  //       if (!res)
  //         return Promise.reject(errors.noDeliveryWithoutEvidence);
  //
  //       // Set status' is_processed to true and add new status list with is_processed as true
  //       res.status_list.push({
  //         status: _const.ORDER_STATUS.Delivered,
  //         agent_id: res.to.customer._id ? mongoose.Types.ObjectId(res.to.customer._id) : mongoose.Types.ObjectId(res.delivery_agent),
  //         is_processed: true
  //       });
  //
  //       const tempFilePath = file.path.replace(/\\/g, '/');
  //       const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);
  //
  //       return this.DeliveryModel.findOneAndUpdate(
  //         {
  //           _id: mongoose.Types.ObjectId(body._id),
  //         },
  //         {
  //           $set: {
  //             status_list: res.status_list,
  //             delivered_evidence: path,
  //           }
  //         }, {
  //           new: true,
  //         });
  //     })
  //     .then(res => {
  //       let promiseList = [];
  //
  //       let orderIds = res.order_details.map(el => el.order_id);
  //       let orderLineIds = res.order_details.map(el => el.order_line_ids).reduce((a, b) => a.concat(b), []);
  //
  //       return models()['Order' + (Delivery.test ? 'Test' : '')].aggregate([
  //         {
  //           $match: {'_id': {$in: orderIds}}
  //         },
  //         {
  //           $unwind: {
  //             path: '$order_lines',
  //             preserveNullAndEmptyArrays: true
  //           }
  //         },
  //         {
  //           $match: {'order_lines._id': {$in: orderLineIds}},
  //         }
  //       ]);
  //     })
  //     .then(res => {
  //       let ticket = new Ticket(Delivery.test);
  //       let promiseList = [];
  //
  //       res.forEach(el => {
  //         promiseList.push(ticket.closeCurrentTicket(el._id, el.order_lines, body.customer_id));
  //       });
  //
  //       return Promise.all(promiseList);
  //     })
  // }
  //
  // // this function call by orderId and orderlineId
  // getDeliveryByOrderLine(user, body) {
  //   return this.DeliveryModel.aggregate([
  //     {
  //       $match: {
  //         $and: [
  //           {'order_details.order_id': mongoose.Types.ObjectId(body.orderId)},
  //           {'order_details.order_line_ids': mongoose.Types.ObjectId(body.orderLineId)}
  //         ]
  //       }
  //     },
  //     // {
  //     //   $addFields: {'last_status': {"$arrayElemAt": ["$status_list", -1]}}
  //     // },
  //     // {
  //     //   $match: isDeliveredMatching
  //     // },
  //     {
  //       $lookup: {
  //         from: 'customer',
  //         localField: 'from.customer._id',
  //         foreignField: '_id',
  //         as: 'from_customer'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_customer',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_customer.addresses',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     // {
  //     //   $addFields: {'from_adr_id_cmp': {$cmp: ['$from.customer.address_id', '$from_customer.addresses._id']}}
  //     // },
  //     // {
  //     //   $match: {
  //     //     from_adr_id_cmp: 0,
  //     //   }
  //     // },
  //     {
  //       $lookup: {
  //         from: 'warehouse',
  //         localField: 'from.warehouse_id',
  //         foreignField: '_id',
  //         as: 'from_warehouse'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$from_warehouse',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: '$_id',
  //         processed_by: {$first: '$processed_by'},
  //         from: {
  //           $first: {
  //             customer: {
  //               first_name: '$from_customer.first_name',
  //               surname: '$from_customer.surname',
  //               username: '$from_customer.username',
  //               address: '$from_customer.addresses',
  //               _id: '$from_customer._id'
  //             },
  //             warehouse: '$from_warehouse'
  //           }
  //         },
  //         to: {$first: '$to'},
  //         shelf_code: {$first: '$shelf_code'},
  //         is_return: {$first: '$is_return'},
  //         start: {$first: '$start'},
  //         end: {$first: '$end'},
  //         delivery_start: {$first: '$delivery_start'},
  //         delivery_end: {$first: '$delivery_end'},
  //         order_details: {$first: '$order_details'},
  //         delivery_agent: {$first: '$delivery_agent'},
  //         status_list: {$first: '$status_list'},
  //         delivered_evidence: {$first: '$delivered_evidence'},
  //         min_end: {$first: '$min_end'},
  //         min_slot: {$first: '$min_slot'},
  //       }
  //     },
  //     {
  //       $project: {
  //         _id: 1,
  //         processed_by: 1,
  //         from: 1,
  //         from_customer_name: {$toLower: {$concat: ['$from.customer.first_name' + ' ' + '$from.customer.surname']}},
  //         to: 1,
  //         shelf_code: 1,
  //         is_return: 1,
  //         start: 1,
  //         end: 1,
  //         delivery_start: 1,
  //         delivery_end: 1,
  //         order_details: 1,
  //         delivery_agent: 1,
  //         status_list: 1,
  //         delivered_evidence: 1,
  //         min_end: 1,
  //         min_slot: 1,
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'customer',
  //         localField: 'to.customer._id',
  //         foreignField: '_id',
  //         as: 'to_customer'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_customer',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_customer.addresses',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     // {
  //     //   $addFields: {'to_adr_id_cmp': {$cmp: ['$to.customer.address_id', '$to_customer.addresses._id']}}
  //     // },
  //     // {
  //     //   $match: {
  //     //     to_adr_id_cmp: 0,
  //     //   }
  //     // },
  //     {
  //       $lookup: {
  //         from: 'warehouse',
  //         localField: 'to.warehouse_id',
  //         foreignField: '_id',
  //         as: 'to_warehouse'
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$to_warehouse',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $lookup: {
  //         from: 'agent',
  //         localField: 'delivery_agent',
  //         foreignField: '_id',
  //         as: 'sender_agent',
  //       }
  //     },
  //     {
  //       $unwind: {
  //         path: '$sender_agent',
  //         preserveNullAndEmptyArrays: true
  //       }
  //     },
  //     {
  //       $group: {
  //         _id: '$_id',
  //         delivery_agent: {
  //           $first: {
  //             first_name: '$sender_agent.first_name',
  //             surname: '$sender_agent.surname',
  //             username: '$sender_agent.username',
  //             _id: '$sender_agent._id',
  //           }
  //         },
  //         from: {$first: '$from'},
  //         to: {
  //           $first: {
  //             customer: {
  //               first_name: '$to_customer.first_name',
  //               surname: '$to_customer.surname',
  //               username: '$to_customer.username',
  //               address: '$to_customer.addresses',
  //               _id: '$to_customer._id'
  //             },
  //             warehouse: '$to_warehouse'
  //           }
  //         },
  //         shelf_code: {$first: '$shelf_code'},
  //         is_return: {$first: '$is_return'},
  //         start: {$first: '$start'},
  //         end: {$first: '$end'},
  //         delivery_start: {$first: '$delivery_start'},
  //         delivery_end: {$first: '$delivery_end'},
  //         order_details: {$first: '$order_details'},
  //         status_list: {$first: '$status_list'},
  //         delivered_evidence: {$first: '$delivered_evidence'},
  //         min_end: {$first: '$min_end'},
  //         min_slot: {$first: '$min_slot'},
  //       }
  //     },
  //     {
  //       $project: {
  //         _id: 1,
  //         delivery_agent: 1,
  //         from: 1,
  //         from_customer_name: 1,
  //         to: 1,
  //         to_customer_name: {$toLower: {$concat: ['$to.customer.first_name', ' ', '$to.customer.surname']}},
  //         agent_name: {$toLower: {$concat: ['$delivery_agent.first_name', ' ', '$delivery_agent.surname']}},
  //         to_warehouse_name: {$toLower: '$to.warehouse.name'},
  //         shelf_code: 1,
  //         is_return: 1,
  //         start: 1,
  //         end: 1,
  //         delivery_start: 1,
  //         delivery_end: 1,
  //         order_details: 1,
  //         is_delivered: {
  //           $cond: [
  //             {$not: ['$delivery_end']},
  //             1,
  //             0
  //           ]
  //         },
  //         status_list: 1,
  //         delivered_evidence: 1,
  //         min_end: 1,
  //         min_slot: 1,
  //       }
  //     },
  //     // {
  //     //   $match: nameMatching
  //     // },
  //     // {
  //     //   $sort: sortOption
  //     // },
  //     // {
  //     //   $group: {
  //     //     '_id': null,
  //     //     result: {$push: '$$ROOT'},
  //     //     total: {$sum: 1}
  //     //   }
  //     // },
  //     // {
  //     //   $project: {
  //     //     total: 1,
  //     //     result: {
  //     //       $slice: ['$result', Number.parseInt(offset), Number.parseInt(limit)]
  //     //     }
  //     //   }
  //     // }
  //   ]);
  // }
}


module.exports = DeliveryTicket;
