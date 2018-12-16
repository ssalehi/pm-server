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

  async setDeliveryAsEnded(delivery, userId) {

    try {
      return this.setTicket(delivery, _const.DELIVERY_STATUS.ended, userId);
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
      if (options && options.type === _const.LOGISTIC_SEARCH.InternalAssinedDelivery) {
        search = this.searchInternalAssinedDelivery(user.id, offset, limit);
      }
      if (options && options.type === _const.LOGISTIC_SEARCH.OnDelivery) {
        search = this.searchOnDelivery(user.id, offset, limit);
      }

      if (!search || !search.mainQuery || !search.countQuery)
        throw error.invalidSearchQuery;

      let result = await this.DeliveryModel.aggregate(search.mainQuery);
      let res = await this.DeliveryModel.aggregate(search.countQuery)
      let totalCount = res[0] ? res[0].count : 0;
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
          'start': -1,
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

  searchInternalAssinedDelivery(agentId, offset, limit) {
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
        $project: {
          _id: 1,
          to: 1,
          from: 1,
          tickets: 1,
          order_details: 1,
          last_ticket: '$last_ticket',
          order_line: '$order.order_lines',
          cmp_value: {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}
        }
      },
      {
        $match: {
          cmp_value: {$eq: 0}
        }
      },
      {
        $group: {
          _id: '$order_details.order_id',
          delivery_id: {$first: '$_id'},
          order_lines: {$push: '$order_line'},
          to: {$first: '$to'},
          from: {$first: '$from'},
          tickets: {$first: '$tickets'},
          last_ticket: {$first: '$last_ticket'},
          order_details: {$first: '$order_details'}
        }
      },
      {
        $group: {
          _id: '$delivery_id',
          order_details: {
            $push: {
              _id: '$order_details._id',
              completed_order: '$order_details.completed_order',
              order_id: '$order_details.order_id',
              order_lines: '$order_lines'
            }
          },
          to: {$first: '$to'},
          from: {$first: '$from'},
          tickets: {$first: '$tickets'},
          last_ticket: {$first: '$last_ticket'},
        }
      },
      {
        $sort: {
          'start': -1,
        }
      },
      {
        $skip: Number.parseInt(offset)
      },
      {
        $limit: Number.parseInt(limit)
      }
    ];

    if (body.Full)
      result.mainQuery = postQuery;
    else
      result.mainQuery = preQuery;

    result.countQuery = [
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
        $count: 'count'
      }
    ];

    return result;
  }

  searchOnDelivery(agentId, offset, limit) {
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
        $sort: {
          'start': -1,
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
        $count: 'count'
      }
    ];

    return result;
  }



}


module.exports = DeliveryTicket;
