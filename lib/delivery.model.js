const _const = require('./const.list');
const mongoose = require('mongoose');
const errors = require('./errors.list');
const DeliveryTicket = require('./delivery_ticket.model');
const moment = require('moment');
const models = require('../mongo/models.mongo');
const Warehouse = require('./warehouse.model');
const WarehouseModel = require('./warehouse.model');
const socket = require('../socket');

class Delivery extends DeliveryTicket {

  constructor(test = Delivery.test) {
    super(test);
    Delivery.test = test;
  }

  async initiate(order, orderLine, from, to, receiverId, isExternal = false) {
    try {
      const fromCondition = from.customer && from.customer._id ? {'from.customer._id': {$eq: mongoose.Types.ObjectId(from.customer._id)}} : {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(from.warehouse_id)}};
      const toCondition = to.customer && to.customer._id ? {'to.customer._id': {$eq: mongoose.Types.ObjectId(to.customer._id)}} : {'to.warehouse_id': {$eq: mongoose.Types.ObjectId(to.warehouse_id)}};

      let currentDay = moment().format('YYYY-MM-DD');
      let nextDay = moment().add('d', 1).format('YYYY-MM-DD');

      let delivery = await (this.DeliveryModel.findOne({
        $and: [
          {
            $or: [
              {start: {$eq: currentDay}},
              {start: {$eq: nextDay}},
            ]
          },
          fromCondition,
          toCondition,
        ]
      }).lean());

      if (delivery) { // previous delivery exists whether for current or noxt day

        let validStatus = [
          _const.DELIVERY_STATUS.default,
          _const.DELIVERY_STATUS.agentSet,
          _const.DELIVERY_STATUS.requestPackage,
        ]


        let lastTickt = delivery.tickets[delivery.tickets.length - 1];
        if (!validStatus.includes(lastTickt.status))
          throw errors.invalidDeliveryInfo;

        // Update current delivery
        const foundOrder = delivery.order_details.find(o => o.order_id.toString() === order._id.toString());

        if (foundOrder) {
          let foundOrderLine = foundOrder.order_line_ids.find(x => x.toString() === orderLine._id.toString());
          if (!foundOrderLine)
            foundOrder.order_line_ids.push(orderLine._id);

          return Promise.resolve(delivery);
        }
        else {
          if (isExternal)
            throw new Error("external delivery cannot have more than one order");

          delivery.order_details.push([{
            order_id: order._id,
            order_line_ids: [orderLine._id],
          }]);
        }
        return this.DeliveryModel.findOneAndUpdate(
          {
            _id: delivery._id,
          }, {
            $set: {
              order_details: delivery.order_details,
            }
          }, {
            new: true,
          });
      } else {
        // create new delivery
        delivery = {};
        delivery.order_details = [
          {
            order_id: order._id,
            order_line_ids: [orderLine._id],
          }
        ];

        delivery.start = currentDay
        delivery.from = from;
        delivery.to = to;
        if (isExternal) {
          delivery.slot = order.time_slot;
          delivery.expire_date = order.duration_days ? moment(order.order_time, 'YYYY-MM-DD').add(order.duration_days, 'days') : null;
        }

        delivery = await this.DeliveryModel.create(delivery);
        return super.setDeliveryAsDefault(delivery, mongoose.Types.ObjectId(receiverId));

      }

    } catch (err) {
      console.log('-> error on initiate delivery', err);
    }
  }

  async setDeliveryAgent(body, user) {
    try {

      if (!body.deliveryId || !body.agentId)
        throw new Error('deliveryt id and agent id are required to set delivey agent')

      let preDelivery = await this.DeliveryModel.aggregate([
        {

          $match: {
            delivery_agent: {
              $eq: mongoose.Types.ObjectId(body.agentId)
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
                $eq: mongoose.Types.ObjectId(body.agentId)
              }
            },
            {
              'last_ticket.status': {
                $in: [
                  _const.DELIVERY_STATUS.agentSet,
                  _const.DELIVERY_STATUS.requestPackage,
                  _const.DELIVERY_STATUS.started,
                ]
              }
            }]
          }
        },
      ]);

      if (preDelivery && preDelivery.length)
        throw new Error('selected agent has incomplete delivery')

      let delivery = await this.DeliveryModel.findOneAndUpdate(
        {_id: mongoose.Types.ObjectId(body.deliveryId)},
        {
          $set: {
            delivery_agent: mongoose.Types.ObjectId(body.agentId)
          }
        }, {
          new: true
        }
      ).lean();

      await super.setDeliveryAsAgentSet(delivery, user.id, body.agentId);

      if (!this.test)
        socket.sendToNS(user.id);

    } catch (err) {
      console.log('-> error on set delivery agent ', err);
      throw err;
    }
  }

  /**
   * 
   * @param {*} user is delivery agent 
   * @param {*} deliveryId 
   */

  async unassignAgent(deliveryId, user) {
    try {
      if (!deliveryId)
        throw errors.deliveryIdIsRequired;

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (!delivery)
        throw errors.deliveryNotFound;

      if (delivery.tickets[delivery.tickets.length - 1].receiver_id.toString() !== user.id.toString())
        throw errors.noAccess;

      if (delivery.from.warehouse_id) {

        await this.DeliveryModel.update({
          _id: mongoose.Types.ObjectId(delivery._id)
        }, {
            $set: {
              delivery_agent: null
            }
          });

        await super.setDeliveryAsDefault(delivery, delivery.from.warehouse_id, user.id);
        socket.sendToNS(delivery.from.warehouse_id)
      }
    } catch (err) {
      console.log('-> error on request  delivery package');
      throw err;
    }
  }
  /**
   * 
   * @param {*} user is delivery agent 
   * @param {*} deliveryId 
   */
  async requestPackage(deliveryId, user) {
    try {
      if (!deliveryId)
        throw errors.deliveryIdIsRequired;

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (!delivery)
        throw errors.deliveryNotFound;

      await super.setDeliveryAsRequestPackage(delivery, user.id);

      let DSS = require('./dss.model');

      return new DSS(this.test).afterRequestForPackage(delivery);

    } catch (err) {
      console.log('-> error on request  delivery package');
      throw err;
    }
  }

  /**
   * 
   * @param {*} deliveryId 
   * @param {*} user 
   * @param {*} preCheck this is used by delivery agent to check whether ready to delivery items matched with its delivey order line details or not befor starting delivery 
   */
  async startDelivery(deliveryId, preCheck, user) {
    try {

      if (!deliveryId)
        throw errors.deliveryIdIsRequired;

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (!delivery)
        throw errors.deliveryNotFound;

      let DSS = require('./dss.model');

      if (preCheck)
        return new DSS(this.test).afterDeliveryStarted(delivery, user, preCheck);

      return super.setDeliveryAsStarted(delivery, user.id);

    } catch (err) {
      console.log('-> erro on start delivery', err);
      throw err;
    }
  }

  async endDelivery(deliveryId, user) {
    try {
      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (delivery)
        throw errors.deliveryNotFound;


      let DSS = require('./dss.model');
      await new DSS(this.test).afterDeliveryEnded(delivery, user);

      return super.setDeliveryAsEnded(delivery, user.id)

    } catch (err) {
      console.log('-> error on end delivery', err);
      throw err;
    }
  }

  async syncDeliveryItems(delivery, excludeItems) {
    try {

      if (!excludeItems || !excludeItems.length)
        return Promise.resolve();

      return this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(delivery._id)
      }, {
          $pull: {
            'order_details.order_line_ids': {
              $in: excludeItems
            }
          }
        })

    } catch (err) {
      console.log('-> error on sync delivery items ', err);
      throw err;
    }

  }

  async endDelivery(deliveryId, user) {
    try {

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (delivery)
        throw errors.deliveryNotFound;

      let DSS = require('./dss.model');

      return new DSS(this.test).afterDeliveryEnded(delivery, user);

    } catch (err) {
      console.log('-> error on end delivery ', err);
      throw err;
    }
  }



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
  //         tickets: {$first: '$tickets'},
  //         delivered_evidence: {$first: '$delivered_evidence'},
  //         expire_date: {$first: '$expire_date'},
  //         slot: {$first: '$slot'},
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
  //         tickets: 1,
  //         delivered_evidence: 1,
  //         expire_date: 1,
  //         slot: 1,
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
  //         tickets: {$first: '$tickets'},
  //         delivered_evidence: {$first: '$delivered_evidence'},
  //         expire_date: {$first: '$expire_date'},
  //         slot: {$first: '$slot'},
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
  //         tickets: 1,
  //         delivered_evidence: 1,
  //         expire_date: 1,
  //         slot: 1,
  //       }
  //     },
  //   ]);
  // }

  getDeliveryItems(user, offset, limit, body) {
    let conditions = [];
    if (user.access_level === _const.ACCESS_LEVEL.SalesManager) {
      conditions = [];
    } else if (mongoose.Types.ObjectId.isValid(user.warehouse_id)) {
      conditions = [{'from.warehouse_id': mongoose.Types.ObjectId(user.warehouse_id)}, {'from.customer._id': {$exists: false}}];
    } else {
      return Promise.reject(errors.noAccess);
    }

    if (body.hasOwnProperty('delivery_start') && body.delivery_start) {
      conditions = conditions.concat([{'delivery_start': {$gte: new Date(moment(body.delivery_start).format('YYYY-MM-DD'))}}]);
    }

    if (body.hasOwnProperty('delivery_end') && body.delivery_end) {
      conditions = conditions.concat([{'delivery_end': {$lte: new Date(moment(body.delivery_end).format('YYYY-MM-DD'))}}]);
    }

    if (body.hasOwnProperty('missDeliveryAgent')) {
      if (body.missDeliveryAgent === false) {
        conditions.push({
          $and: [
            {delivery_agent: {$exists: true}},
            {delivery_agent: {$ne: null}}
          ]
        });
      } else if (body.missDeliveryAgent === true) {
        conditions.push({
          $or: [
            {delivery_agent: {$exists: false}},
            {delivery_agent: null}
          ]
        });
      }
    }

    if (conditions.length) {
      conditions = {$and: conditions};
    } else {
      conditions = {};
    }

    let secondConditions = [];

    if (body.hasOwnProperty('isDelivered')) {
      if (body.isDelivered === false)
        secondConditions.push({
          $or: [{'delivery_end': {$exists: false}}, {
            $and: [{
              'delivery_end': {$exists: true},
              'delivery_end': null
            }]
          }]
        });
      else if (body.isDelivered === true)
        secondConditions.push({'delivery_end': {$exists: true}}, {'delivery_end': {$ne: null}});
    }

    if (body.hasOwnProperty('isReturn')) {
      if (body.isReturn === false)
        secondConditions.push({
          $or: [
            {'is_return': {$exists: false}},
            {'is_return': false}
          ]
        });
      else if (body.isReturn === true)
        secondConditions.push({
          $and: [
            {'is_return': {$exists: true}},
            {'is_return': true},
          ]
        });
    }

    if (secondConditions.length) {
      secondConditions = {$and: secondConditions};
    } else {
      secondConditions = {};
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

    let isInternalCondition = {};
    if (body.hasOwnProperty('isInternal')) {
      if (body.isInternal === true)
        isInternalCondition = {'is_internal': true}
      else if (body.isInternal === false)
        isInternalCondition = {
          $or: [
            {'is_internal': {$exists: false}},
            {'is_internal': false}
          ]
        }
    }

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
      sortOption = {end: 1};

    return this.DeliveryModel.aggregate([
      {
        $match: conditions
      },
      {
        $addFields: {'last_status': {"$arrayElemAt": ["$tickets", -1]}}
      },
      {
        $match: secondConditions
      },
      {
        $addFields: {
          is_internal: {
            $cond: {
              if:
              {
                $and: [
                  {$ifNull: ['$to.warehouse_id', false]},
                  {$ifNull: ['$from.warehouse_id', false]}
                ]
              }
              ,
              then: true
              ,
              else: false
            }
          },
        }
      },
      {
        $match: isInternalCondition
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
          order_details: {$first: '$order_details'},
          delivery_agent: {$first: '$delivery_agent'},
          tickets: {$first: '$tickets'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
          is_internal: {$first: '$is_internal'},
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
          tickets: 1,
          delivered_evidence: 1,
          expire_date: 1,
          slot: 1,
          is_internal: 1,
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
          as: 'order_info',
        }
      },
      {
        $unwind: {
          path: '$order_info',
          preserveNullAndEmptyArrays: true,
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
                first_name: '$order_info.address.recipient_name',
                surname: '$order_info.address.recipient_surname',
                address: '$order_info.address',
                _id: '$to.customer._id'
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
          tickets: {$first: '$tickets'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
          order_info: {$first: '$order_info'},
          is_internal: {$first: '$is_internal'}
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
          tickets: 1,
          delivered_evidence: 1,
          expire_date: 1,
          slot: 1,
          common_order_lines: {
            $setIntersection: ['$order_info.order_lines._id', '$order_details.order_line_ids']
          },
          is_internal: 1,
          order_info: 1,
        }
      },
      {
        $match: nameMatching
      },
      {
        $unwind: {
          path: '$common_order_lines',
        }
      },
      {
        $unwind: {
          path: '$order_info.order_lines'
        }
      },
      {
        $addFields: {'cur_order_line': {$cmp: ['$order_info.order_lines._id', '$common_order_lines']}}
      },
      {
        $match: {
          cur_order_line: 0,
        }
      },
      {
        $lookup: {
          from: 'product',
          localField: 'order_info.order_lines.product_id',
          foreignField: '_id',
          as: 'products'
        }
      },
      {
        $unwind: {
          path: '$products'
        }
      },
      {
        $unwind: {
          path: '$products.instances'
        }
      },
      {
        $addFields: {'cur_product_instance': {$cmp: ['$products.instances._id', '$order_info.order_lines.product_instance_id']}}
      },
      {
        $match: {
          cur_product_instance: 0,
        }
      },
      {
        $group: {
          _id: '$_id',
          delivery_agent: {$first: '$delivery_agent'},
          from: {$first: '$from'},
          to: {$first: '$to'},
          shelf_code: {$first: '$shelf_code'},
          is_return: {$first: '$is_return'},
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          order_details: {$addToSet: '$order_details'},
          tickets: {$first: '$tickets'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
          is_internal: {$first: '$is_internal'},
          product_instances: {
            $addToSet: {
              product_id: '$products._id',
              product_intance_id: '$products.instances._id',
              product_name: '$products.name',
              colors: '$products.colors',
              price: '$products.instances.price',
              size: '$products.instances.size',
              product_color_id: '$products.instances.product_color_id',
              barcode: '$products.instances.barcode'
            }
          },
        }
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
    ])
      .then(res => {
        res = res.length ? res[0] : {total: 0, result: []};
        res.result.forEach(el => {
          if (el.is_internal || el.is_return) {
            delete el.to.customer;
          } else {
            delete el.to.warehouse;
          }
        });
        return Promise.resolve(res);
      });
  }

  updateDelivery(user, body) {
    if (!body._id)
      return Promise.reject(errors.deliveryIdIsRequired);

    const updateObj = {};

    if (body.delivery_agent_id)
      updateObj['delivery_agent'] = body.delivery_agent_id;

    if (!Object.keys(updateObj).length)
      return Promise.resolve('nothing to save');

    updateObj['completed_by'] = user.id;

    return this.DeliveryModel.findOne({
      _id: body._id,
    })
      .then(res => {
        if (res.delivery_start)
          return Promise.reject('cannot change');

        console.log('res.from.warehouse_id ==> ', res.from.warehouse_id.toString());

        if ((user.access_level === _const.ACCESS_LEVEL.SalesManager && !res.is_return) ||
          (!res.is_return && user.warehouse_id.toString() !== res.from.warehouse_id.toString()))
          return Promise.reject(errors.notDeliveryResponsibility);

        return this.DeliveryModel.findOneAndUpdate({
          _id: body._id,
        }, {
            $set: updateObj,
          }, {
            new: true,
          });
      });
  }

  getDeliveryData(delivery_id) {
    return this.DeliveryModel.aggregate([
      {
        $match: {
          '_id': mongoose.Types.ObjectId(delivery_id)
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
        $lookup: {
          from: 'customer',
          localField: 'to.customer._id',
          foreignField: '_id',
          as: 'to_customer'
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
        $lookup: {
          from: 'customer',
          localField: 'from.customer._id',
          foreignField: '_id',
          as: 'from_customer'
        }
      },
      {
        $unwind: {
          path: '$to_customer',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $unwind: {
          path: '$from_customer',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $unwind: {
          path: '$from_warehouse',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $unwind: {
          path: '$to_warehouse',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $unwind: {
          path: '$to_customer.addresses',
          preserveNullAndEmptyArrays: true,
        }
      },
      {
        $unwind: {
          path: '$from_customer.addresses',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          order_details: '$order_details',
          to: {
            customer: '$to_customer',
            customer_address_id: '$to.customer.address_id',
            warehouse: '$to_warehouse'
          },
          from: {
            customer: '$from_customer',
            customer_address_id: '$from.customer.address_id',
            warehouse: '$from_warehouse'
          },
          cmp_value1: {$cmp: ['$to.customer.address_id', '$to_customer.addresses._id']},
          cmp_value2: {$cmp: ['$from.customer.address_id', '$from_customer.addresses._id']},
          start: '$start',
          end: '$end',
          delivery_start: '$delivery_start',
          delivery_end: '$delivery_end',
          shelf_code: '$shelf_code',
          is_return: '$is_return',
          delivered_evidence: '$delivered_evidence',
          tickets: '$tickets',
          expire_date: '$expire_date',
          slot: '$slot',
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
        $project: {
          order_details: '$order_details',
          to: '$to',
          from: '$from',
          start: '$start',
          end: '$end',
          delivery_start: '$delivery_start',
          delivery_end: '$delivery_end',
          shelf_code: '$shelf_code',
          is_return: '$is_return',
          delivered_evidence: '$delivered_evidence',
          tickets: '$tickets',
          expire_date: '$expire_date',
          slot: '$slot',
        }
      }
    ]);
  }

  makeDeliveryShelfCode(delivery_Id) {
    let hub_id;
    let delivery;
    return new Warehouse(Delivery.test).getHub().then(res => {
      hub_id = res[0]._id;
      return this.DeliveryModel.aggregate([
        {
          $match: {
            $and: [
              {'delivery_end': {$exists: false}}
            ]
          }
        },
      ]);
    }).then((res) => {
      delivery = res.find(d => d._id.toString() === delivery_Id.toString());
      res = res.filter(d => d.shelf_code).map(d => d.shelf_code).sort();
      let shelfCodeValue = "";
      if (delivery && delivery.shelf_code)
        return Promise.resolve({
          shelf_code: delivery.shelf_code,
          exist: true,
        });
      else if (!delivery)
        return Promise.reject('There is no delivery with this id');
      if (!res.find(d => d === "AA"))
        shelfCodeValue = "AA";
      for (let i = 0; i < res.length; i++) {
        let d = res[i];
        let firstChar = String.fromCharCode(d.charCodeAt(1) + 1);
        let secondChar = String.fromCharCode(d.charCodeAt(0));
        if (firstChar > "Z") {
          firstChar = "A";
          secondChar = String.fromCharCode(d.charCodeAt(0) + 1)
        }
        if (!res.find(d => d === (secondChar + firstChar))) {
          shelfCodeValue = secondChar + firstChar;
          break;
        }
      }

      return this.DeliveryModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(delivery._id),
      }, {
          $set: {
            shelf_code: shelfCodeValue,
          }
        }, {
          new: true,
        })
        .then(res => {
          if (!res)
            return Promise.reject('There is not delivery with this id');

          return Promise.resolve({
            shelf_code: res.shelf_code,
            exist: false,
          });
        });
    });
  }

  getDeliveryAgentItems(user, isDelivered, deliveryStatus, isProcessed = false) {
    if (!deliveryStatus)
      return Promise.reject(errors.deliveryStatusIsRequired);

    let condition = [{'delivery_agent': mongoose.Types.ObjectId(user.id)}];

    if (isDelivered !== null && isDelivered !== undefined) {
      if (isDelivered) {
        // should fetch delivered items
        condition.push({'delivery_end': {$ne: null}});
      } else {
        // should fetch not-delivered items
        condition.push(
          {
            $or: [
              {'delivery_end': {$exists: false}},
              {'delivery_end': {$eq: null}}
            ]
          }
        );
      }
    }

    let secondConditionPart = [{'last_status.status': deliveryStatus}];

    if (isDelivered && !isProcessed && deliveryStatus === _const.ORDER_LINE_STATUS.Delivered) {
      condition = condition.concat([
        {'to.customer._id': {$exists: true}},
        {'to.customer._id': {$ne: null}}
      ]);
    }

    if (isDelivered && isProcessed && deliveryStatus === _const.ORDER_LINE_STATUS.Delivered) {
      secondConditionPart.push({
        $or: [
          {
            $and: [
              {
                $or: [
                  {'to.customer._id': {$exists: true}},
                  {'to.customer._id': {$ne: null}},
                ]
              },
              {'last_status.is_processed': isProcessed},
            ]
          },
          {
            $and: [
              {'to.warehouse_id': {$exists: true}},
              {'to.warehouse_id': {$ne: null}},
            ]
          }
        ]
      });
    } else
      secondConditionPart.push({'last_status.is_processed': isProcessed});

    // Should fetch items and related addresses and tickets (to sure these delivery items should passed to delivery agent to deliver)
    return this.DeliveryModel.aggregate([
      {
        $match: {$and: condition}
      },
      {
        $addFields: {'last_status': {"$arrayElemAt": ["$tickets", -1]}}
      },
      {
        $match: {
          $and: secondConditionPart
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
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          delivery_agent: {$first: '$delivery_agent'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
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
          start: {$first: '$start'},
          end: {$first: '$end'},
          delivery_start: {$first: '$delivery_start'},
          delivery_end: {$first: '$delivery_end'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
        }
      }
    ]);
  }

  changeStatus(user, body) {
    if (!body.delivery_ids)
      return Promise.reject(errors.targetDeliveryIdsAreRequired);

    if (!body.target_status)
      return Promise.reject(errors.deliveryStatusIsRequired);

    let promiseList = [];

    body.delivery_ids.forEach(id => {
      promiseList.push(this.addStatus(id, user, body.target_status));
    });

    return Promise.all(promiseList)
      .then(res => {
        if (body.target_status === _const.ORDER_LINE_STATUS.OnDelivery)
          return this.DeliveryModel.update(
            {
              _id: {$in: body.delivery_ids.map(el => mongoose.Types.ObjectId(el))},
            }, {
              $set: {
                delivery_start: new Date(),
              }
            }, {
              multi: true,
            })

        return Promise.resolve();
      })
  }

  addStatus(delivery_id, user, target_status) {
    let deliveryDetails = {};
    let orders = [];

    return this.DeliveryModel.findOneAndUpdate(
      {
        _id: mongoose.Types.ObjectId(delivery_id),
      },
      {
        $set: {
          'tickets.$[i].is_processed': true,
          'tickets.$[i].agent_id': user.id,
        },
      },
      {
        new: true,
        arrayFilters: [
          {'i.is_processed': false},
        ]
      })
      .then(res => {
        return this.DeliveryModel.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(delivery_id),
          },
          {
            $addToSet: {
              'tickets': {
                status: target_status,
              }
            }
          },
          {
            new: true,
          });
      })
      .then(res => {
        deliveryDetails = res;
        let promiseList = [];

        let orderIds = res.order_details.map(el => el.order_id);
        let orderLineIds = res.order_details.map(el => el.order_line_ids).reduce((a, b) => a.concat(b), []);

        return models()['Order' + (Delivery.test ? 'Test' : '')].aggregate([
          {
            $match: {'_id': {$in: orderIds}}
          },
          {
            $unwind: {
              path: '$order_lines',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {'order_lines._id': {$in: orderLineIds}},
          }
        ]);
      })
      .then(res => {
        orders = res;
        return new WarehouseModel(Delivery.test).getAll();
      })
      .then(res => {
        let ticket = new Ticket(Delivery.test);
        let promiseList = [];

        orders.forEach(el => {
          const foundToWarehouse = deliveryDetails && deliveryDetails.to.warehouse_id ?
            res.find(w => w._id.toString() === deliveryDetails.to.warehouse_id.toString()) : null;

          promiseList.push(ticket.setTicket(
            el,
            el.order_lines,
            target_status,
            user.id,
            target_status === _const.ORDER_LINE_STATUS.Delivered && foundToWarehouse ? foundToWarehouse._id : user.id,
          ));
        });

        return Promise.all(promiseList);
      })
  }

  finishDelivery(user, body) {
    if (!body._id)
      return Promise.reject(errors.deliveryIdIsRequired);

    return this.DeliveryModel.findOneAndUpdate(
      {
        $and: [
          {_id: mongoose.Types.ObjectId(body._id)},
          {
            $or: [
              {'delivery_end': {$exists: false}},
              {'delivery_end': null},
            ]
          },
        ]
      },
      {
        $set: {
          delivery_end: new Date(),
        }
      }, {
        new: true,
      })
      .then(res => {
        return this.changeStatus(user, {
          delivery_ids: [body._id.toString()],
          target_status: _const.ORDER_LINE_STATUS.Delivered,
        });
      });
  }

  setEvidence(body, file, delivery_evidence_id) {
    if (!body._id)
      return Promise.reject(errors.deliveryIdIsRequired);

    if (!body.customer_id)
      return Promise.reject(errors.customerIdRequired);

    return this.DeliveryModel.findOne({
      $and: [
        {_id: mongoose.Types.ObjectId(body._id)},
        {
          $or: [
            {'delivered_evidence': {$exists: false}},
            {'delivered_evidence': null}
          ]
        }
      ]
    })
      .then(res => {
        if (!res)
          return Promise.reject(errors.noDeliveryWithoutEvidence);

        // Set status' is_processed to true and add new status list with is_processed as true
        res.tickets.push({
          status: _const.ORDER_LINE_STATUS.Delivered,
          agent_id: res.to.customer._id ? mongoose.Types.ObjectId(res.to.customer._id) : mongoose.Types.ObjectId(res.delivery_agent),
          is_processed: true
        });

        const tempFilePath = file.path.replace(/\\/g, '/');
        const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);

        return this.DeliveryModel.findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(body._id),
          },
          {
            $set: {
              tickets: res.tickets,
              delivered_evidence: path,
            }
          }, {
            new: true,
          });
      })
      .then(res => {
        let promiseList = [];

        let orderIds = res.order_details.map(el => el.order_id);
        let orderLineIds = res.order_details.map(el => el.order_line_ids).reduce((a, b) => a.concat(b), []);

        return models()['Order' + (Delivery.test ? 'Test' : '')].aggregate([
          {
            $match: {'_id': {$in: orderIds}}
          },
          {
            $unwind: {
              path: '$order_lines',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {'order_lines._id': {$in: orderLineIds}},
          }
        ]);
      })
      .then(res => {
        let ticket = new Ticket(Delivery.test);
        let promiseList = [];

        res.forEach(el => {
          promiseList.push(ticket.closeCurrentTicket(el._id, el.order_lines, body.customer_id));
        });

        return Promise.all(promiseList);
      })
  }


  getFreeDeliveryOption() {
    return models()['FreeDeliveryOption' + (Delivery.test ? 'Test' : '')].find();
  }

  upsertFreeDeliveryOption(data) {
    // Check id to be valid when updating
    if (data.id && !mongoose.Types.ObjectId.isValid(data.id)) {
      return Promise.reject(errors.invalidId);
    }

    // Check data to be complete on inserting
    if (!data.id && ['province', 'min_price'].some(el => !data[el])) {
      return Promise.reject(errors.dataIsNotCompleted);
    }

    const upsertedData = {};

    ['province', 'min_price']
      .forEach(el => {
        if (data[el])
          upsertedData[el] = data[el]
      });

    const existanceCondition = {province: data.province};

    if (data.id) {
      existanceCondition['_id'] = {
        $ne: mongoose.Types.ObjectId(data.id)
      };
    }

    return models()['FreeDeliveryOption' + (Delivery.test ? 'Test' : '')].findOne(existanceCondition)
      .then(res => {
        if (res) {
          return Promise.reject(errors.duplicatedProvince);
        }
        return models()['FreeDeliveryOption' + (Delivery.test ? 'Test' : '')].findOneAndUpdate(
          {
            _id: mongoose.Types.ObjectId(data.id),
          },
          upsertedData,
          {
            upsert: true,
            new: true
          });
      })
      .then(res => Promise.resolve(res._id));
  }

  deleteFreeDeliveryOption(data) {
    if (!data.id) {
      return Promise.reject(errors.dataIsNotCompleted);
    }

    if (!mongoose.Types.ObjectId.isValid(data.id)) {
      return Promise.reject(errors.invalidId);
    }

    return models()['FreeDeliveryOption' + (Delivery.test ? 'Test' : '')].remove({
      _id: mongoose.Types.ObjectId(data.id),
    });
  }

  getUnassignedDeliveries() {
    return this.DeliveryModel.aggregate([
      {
        $match: {
          $or: [
            {delivery_agent: {$exists: false}},
            {delivery_agent: null}
          ]
        }
      },
      {
        $match: {
          $or: [
            {'from.customer._id': {$exists: true}},
            {'to.customer._id': {$exists: true}}
          ]
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
          order_details: {$first: '$order_details'},
          delivery_agent: {$first: '$delivery_agent'},
          tickets: {$first: '$tickets'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
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
        $group: {
          _id: '$_id',
          processed_by: {$first: '$processed_by'},
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
          delivery_agent: {$first: '$delivery_agent'},
          tickets: {$first: '$tickets'},
          delivered_evidence: {$first: '$delivered_evidence'},
          expire_date: {$first: '$expire_date'},
          slot: {$first: '$slot'},
        }
      }
    ]);
  }

  assignDeliveryToAgnet(user, body) {
    if (!body.delivery_ids) {
      return Promise.reject(errors.dataIsNotCompleted);
    }

    if (!body.delivery_ids.length) {
      return Promise.resolve([]);
    }

    let deliveriesOrderDetails = [];

    return this.DeliveryModel.find({
      $and: [
        {
          _id: {
            $in: body.delivery_ids.map(el => mongoose.Types.ObjectId(el)),
          }
        }
      ],
    })
      .then(res => {
        const assignedList = res.filter(el => el.delivery_agent && el.delivery_agent.toString() !== user.id.toString());

        if (assignedList.length) {
          return Promise.reject(errors.deliveryItemIsAlreadyAssigned);
        }

        deliveriesOrderDetails = res.map(el => el.order_details).reduce((a, b) => a.concat(b), []);

        return this.DeliveryModel.update(
          {
            _id: {
              $in: body.delivery_ids.map(el => mongoose.Types.ObjectId(el))
            }
          },
          {
            $set: {
              delivery_agent: user.id,
            },
          },
          {
            multi: true
          }
        );
      });
  }

  unassignDeliveryFromAgent(user, body) {
    if (!body.delivery_ids) {
      return Promise.reject(errors.dataIsNotCompleted);
    }

    if (!body.delivery_ids.length) {
      return Promise.resolve([]);
    }

    let deliveriesOrderDetails = [];

    return this.DeliveryModel.find({
      _id: {
        $in: body.delivery_ids.map(el => mongoose.Types.ObjectId(el)),
      },
      delivery_agent: {$exists: true},
    })
      .then(res => {
        const agentResponsible = res.filter(el => el.delivery_agent.toString() !== user.id.toString());

        if (agentResponsible.length) {
          return Promise.reject(errors.notDeliveryResponsibility);
        }

        deliveriesOrderDetails = res.map(el => el.order_details).reduce((a, b) => a.concat(b), []);

        return this.DeliveryModel.update(
          {
            _id: {
              $in: body.delivery_ids.map(el => mongoose.Types.ObjectId(el))
            }
          },
          {
            $set: {
              delivery_agent: null,
            },
          },
          {
            multi: true
          }
        );
      });
  }



}

Delivery.test = false;
module.exports = Delivery;