const Base = require('./base.model');
const _const = require('./const.list');
const mongoose = require('mongoose');
const errors = require('./errors.list');
const Ticket = require('./ticket.model');
const moment = require('moment');

class Delivery extends Base {

  constructor(test = Delivery.test) {
    super('Delivery', test);
    this.DeliveryModel = this.model;
  }

  getDeliveryItems(user, offset, limit, body) {
    let access_condition = [];
    if (user.access_level === _const.ACCESS_LEVEL.SalesManager) {
      access_condition = {$and: [{'from.warehouse_id': {$exists: false}}, {'from.customer': {$exists: true}}, {'is_return': true}]};
    } else if (mongoose.Types.ObjectId.isValid(user.warehouse_id)) {
      access_condition = {$and: [{'from.warehouse_id': mongoose.Types.ObjectId(user.warehouse_id)}, {'from.customer_id': {$exists: false}}]};
    } else {
      return Promise.reject(errors.noAccess);
    }

    let conditions = [];

    if (body.hasOwnProperty('isDelivered')) {
      if (body.isDelivered === false)
        conditions.push({$or: [{'delivery_end': {$exists: false}}, {$and: [{'delivery_end': {$exists: true}, 'delivery_end': null}]}]});
      else if (body.isDelivered === true)
        conditions = conditions.concat([{'delivery_end': {$exists: true}}, {'delivery_end': {$ne: null}}]);
    }
    if (body.hasOwnProperty('endDate') && body.endDate) {
      conditions = conditions.concat([{'end': {$lte: new Date(moment(body.endDate).format('YYYY-MM-DD'))}}]);
    }

    if (conditions.length)
      conditions = {$and: conditions};
    else
      conditions = {};

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

    return this.DeliveryModel.aggregate([
      {
        $match: access_condition
      },
      {
        $match: conditions
      },
      {
        $unwind: {
          path: '$order_details',
          preserveNullAndEmptyArrays: true
        }
      },
      // {
      //   $unwind: {
      //     path: '$order_details.order_line_ids',
      //     preserveNullAndEmptyArrays: true
      //   }
      // },
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
      // {
      //   $unwind: {
      //     path: '$order.order_lines',
      //     preserveNullAndEmptyArrays: true
      //   }
      // },
      // {
      //   $addFields: {'id_cmp': {$cmp: ['$order.order_lines._id', '$order_details.order_line_ids']}}
      // },
      // {
      //   $match: {
      //     id_cmp: 0,
      //   }
      // },
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
          processed_by: {$first: '$processed_by'},
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
          slot: {$first: '$order.delivery.time_slot'},
          order_details: {
            $push: {
              order_id: '$order.order_id',
              order_line_ids: '$order_details.order_line_ids',
              slot: '$order.slot'
            }
          },
          delivery_agent: {$first: '$delivery_agent'},
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
          slot: 1,
          order_details: 1,
          delivery_agent: 1,
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
          slot: {$first: '$slot'},
          order_details: {$first: '$order_details'},
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
          slot: 1,
          order_details: 1,
          is_delivered: {
            $cond: [
              {$not: ['$delivery_end']},
              1,
              0
            ]
          },
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
    ]);
  }

  updateDelivery(user, body) {
    if (!body._id)
      return Promise.reject(errors.deliveryIdIsRequired);

    const updateObj = {};

    if (body.delivery_agent_id)
      updateObj['delivery_agent'] = body.delivery_agent_id;

    if (body.start)
      updateObj['start'] = body.start;

    if (!Object.keys(updateObj).length)
      return Promise.resolve('nothing to save');

    updateObj['completed_by'] = user.id;

    return this.DeliveryModel.findOneAndUpdate({
      _id: body._id,
    }, {
        $set: updateObj,
      }, {
        new: true,
      })
      .then(res => {
        if (!mongoose.Types.ObjectId.isValid(res.delivery_agent) || !res.start)
          return Promise.resolve();

        let ticket = new Ticket(Delivery.test);
        let promiseList = [];

        res.order_details.forEach(order => {
          order.order_line_ids.forEach(order_line => {
            promiseList.push(ticket.setTicket(order.order_id, order_line, _const.ORDER_STATUS.DeliverySet, user.id, mongoose.Types.ObjectId(res.delivery_agent)));
          });
        });

        return Promise.all(promiseList);
      });
  }
}

Delivery.test = false;
module.exports = Delivery;