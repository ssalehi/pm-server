const _const = require('./const.list');
const mongoose = require('mongoose');
const errors = require('./errors.list');
const DeliveryTicket = require('./delivery_ticket.model');
const moment = require('moment');
const models = require('../mongo/models.mongo');
const WarehouseModel = require('./warehouse.model');
const socket = require('../socket');

class Delivery extends DeliveryTicket {

  constructor(test = Delivery.test) {
    super(test);
    Delivery.test = test;
  }

  async makeNewDelivery(order, orderLine, start, from, to, isExternal, receiverId, isExternalRetrun = false) {

    let delivery = {};
    delivery.order_details = [
      {
        order_id: order._id,
        order_line_ids: [orderLine._id],
      }
    ];

    delivery.start = start
    delivery.from = from;
    delivery.to = to;
    if (isExternal && !isExternalRetrun) {
      delivery.slot = order.delivery_info.time_slot;
      delivery.expire_date = order.delivery_info.duration_days ? moment(order.order_time, 'YYYY-MM-DD').add(order.delivery_info.duration_days, 'days') : null;
    }

    delivery = await this.DeliveryModel.create(delivery);
    return super.setDeliveryAsDefault(delivery, mongoose.Types.ObjectId(receiverId));
  }

  async initiate(order, orderLine, from, to, receiverId, findPreDelivery = false) {
    try {

      if ((from.customer && !from.customer.address) || (to.customer && !to.customer.address))
        throw new Error('customer address is not set for delivery point');

      let isExternal = !!((from.customer && to.warehouse_id) || (to.customer && from.warehouse_id));
      const isExternalReturn = !!(isExternal && from.customer);


      if ((isExternal && from.warehouse_id && to.warehouse_id) || (from.customer && to.customer)) {
        throw errors.invalidDeliveryInfo;
      }

      const fromCondition = from.customer ?
        {'from.customer.address._id': {$eq: mongoose.Types.ObjectId(from.customer.address._id)}} :
        {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(from.warehouse_id)}};

      const toCondition = to.customer ?
        {
          $and: [
            {'to.customer.address._id': {$eq: mongoose.Types.ObjectId(to.customer.address._id)}},
            {'slot': {$eq: order.delivery_info.time_slot}}
          ]
        } :
        {'to.warehouse_id': {$eq: mongoose.Types.ObjectId(to.warehouse_id)}};



      let preActiveDelivery = await this.getPreActiveDelivery(fromCondition, toCondition);

      if (findPreDelivery) {
        if (!preActiveDelivery || !preActiveDelivery.length)
          throw errors.deliveryNotFound;

        return Promise.resolve(preActiveDelivery[0]);
      }

      if (preActiveDelivery && preActiveDelivery.length) { // existing active delivery
        preActiveDelivery = preActiveDelivery[0];

        const foundOrder = preActiveDelivery.order_details.find(o => {
          return o.order_id.toString() === order._id.toString()
        });

        if (foundOrder) {
          let foundOrderLine = foundOrder.order_line_ids.find(x => {
            return x.toString() === orderLine._id.toString()
          });
          if (!foundOrderLine)
            foundOrder.order_line_ids.push(orderLine._id);
          else
            return Promise.resolve(preActiveDelivery);
        }
        else {
          preActiveDelivery.order_details.push({
            order_id: order._id,
            order_line_ids: [orderLine._id],
          });
        }
        return this.DeliveryModel.findOneAndUpdate(
          {
            _id: preActiveDelivery._id,
          }, {
            $set: {
              order_details: preActiveDelivery.order_details,
            }
          }, {
            new: true,
          }).lean();
      } else { // no pre existing active delivery

        let currentDay = moment(moment().format('YYYY-MM-DD'));
        return this.makeNewDelivery(order, orderLine, currentDay, from, to, isExternal, receiverId, isExternalReturn);
      }


    } catch (err) {
      console.log('-> error on initiate delivery', err);
      throw err;
    }
  }

  async getPreActiveDelivery(fromCondition, toCondition) {
    return this.DeliveryModel.aggregate([
      {
        $match: {
          $and: [
            fromCondition,
            toCondition,
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
        $lookup: {
          from: 'agent',
          localField: 'agent_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: {
          path: '$agent',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);
  }

  async assignAgent(body, user) {
    try {

      if (!body.deliveryId)
        throw new Error('delivery id is required to set delivery agent')

      let foundDelivery = await this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(body.deliveryId)

      }).lean();

      if (!foundDelivery)
        throw errors.deliveryNotFound;

      let isExternal = (foundDelivery.from.customer && foundDelivery.to.warehouse_id) || (foundDelivery.to.customer && foundDelivery.from.warehouse_id);

      let preUnfinishedDelivery = await this.DeliveryModel.findOne({
        delivery_agent: mongoose.Types.ObjectId(!isExternal ? body.agentId : user.id),
        delivery_end: {$eq: null}
      });

      if (preUnfinishedDelivery)
        throw new Error('agent has current unfinished delivery');

      foundDelivery = await this.DeliveryModel.findOneAndUpdate(
        {_id: mongoose.Types.ObjectId(body.deliveryId)},
        {
          $set: {
            delivery_agent: mongoose.Types.ObjectId(!isExternal ? body.agentId : user.id)
          }
        }, {
          new: true
        }
      ).lean();

      if (!isExternal) {
        if (!body.agentId)
          throw new Error('agent id is required to set internal delivery agent')
        await super.setDeliveryAsAgentSet(foundDelivery, user.id, body.agentId);
        if (!this.test)
          socket.sendToNS(user.id);
      } else {
        return super.setDeliveryAsAgentSet(foundDelivery, user.id, user.id);
      }
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

      let foundDelivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (!foundDelivery)
        throw errors.deliveryNotFound;

      let isExternal = (foundDelivery.from.customer && foundDelivery.to.warehouse_id) || (foundDelivery.to.customer && foundDelivery.from.warehouse_id);
      let isRetrun = isExternal && foundDelivery.from.customer;


      if (foundDelivery.tickets[foundDelivery.tickets.length - 1].receiver_id.toString() !== user.id.toString())
        throw errors.noAccess;


      await this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(foundDelivery._id)
      }, {
          $set: {
            delivery_agent: null
          }
        });


      if (!isExternal || (isExternal && !isRetrun)) {
        await super.setDeliveryAsDefault(foundDelivery, foundDelivery.from.warehouse_id, user.id);
      } else if (isExternal && isRetrun) {
        const AgentModel = require('./agent.model');
        let sm = await new AgentModel(this.test).getSalesManager();
        if (!sm)
          throw errors.salesManagerNotFound;
        await super.setDeliveryAsDefault(foundDelivery, sm._id, user.id);
      }

      if (!isExternal) {
        socket.sendToNS(foundDelivery.from.warehouse_id)
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

      let preDelivery = await this.DeliveryModel.aggregate([
        {
          $match: {
            delivery_agent: {
              $eq: mongoose.Types.ObjectId(user.id)
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
                $eq: mongoose.Types.ObjectId(user.id)
              }
            },
            {
              'last_ticket.status': {
                $in: [
                  _const.DELIVERY_STATUS.requestPackage,
                  _const.DELIVERY_STATUS.started,
                ]
              }
            }]
          }
        },
      ]);

      if (preDelivery && preDelivery.length)
        throw new Error('agent has incomplete delivery');


      if (!deliveryId)
        throw errors.deliveryIdIsRequired;

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());


      if (!delivery)
        throw errors.deliveryNotFound;

      let isExternal = !!((delivery.from.customer && delivery.to.warehouse_id) || (delivery.to.customer && delivery.from.warehouse_id));
      let isExternalReturn = !!(isExternal && delivery.from.customer);

      let DSS = require('./dss.model');
      await new DSS(this.test).afterRequestForPackage(delivery, user.id, isExternal, isExternalReturn);

      await super.setDeliveryAsRequestPackage(delivery, user.id);

      if (!isExternalReturn)
        if (!this.test)
          socket.sendToNS(delivery.from.warehouse_id);


    } catch (err) {
      console.log('-> error on request  delivery package');
      throw err;
    }
  }

  /**
   *
   * @param {*} deliveryId
   * @param {*} user
   * @param {*} preCheck this is used by delivery agent to check whether ready to delivery items matched with its delivey order line details or not before starting delivery
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



      let isExternal = !!((delivery.from.customer && delivery.to.warehouse_id) || (delivery.to.customer && delivery.from.warehouse_id));
      let isExternalReturn = !!(isExternal && delivery.from.customer);

      let DSS = require('./dss.model');

      let matchedItems = await new DSS(this.test).afterDeliveryStarted(delivery, user, preCheck, isExternal, isExternalReturn);

      if (preCheck)
        return matchedItems;

      await this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(deliveryId)
      }, {
          $set: {
            delivery_start: moment()
          }
        });

      return super.setDeliveryAsStarted(delivery, user.id);

    } catch (err) {
      console.log('-> error on start delivery', err);
      throw err;
    }
  }

  async endDelivery(deliveryId, user) {
    try {

      if (!deliveryId)
        throw errors.deliveryIdIsRequired;

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());

      if (!delivery)
        throw errors.deliveryNotFound;

      let isExternal = !!((delivery.from.customer && delivery.to.warehouse_id) || (delivery.to.customer && delivery.from.warehouse_id));
      let isExternalReturn = !!(isExternal && delivery.from.customer);


      await this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(deliveryId)
      }, {
          $set: {
            delivery_end: moment().toDate()
          }
        })


      let receiverId;

      if (isExternal && !isExternalReturn) {
        if (delivery.to.customer._id)
          receiverId = delivery.to.customer._id;
        else // guest user
          receiverId = delivery.delivery_agent
      } else {
        receiverId = delivery.to.warehouse_id;
      }

      await super.setDeliveryAsEnded(delivery, user.id, receiverId)

      let DSS = require('./dss.model');
      return new DSS(this.test).afterDeliveryEnded(delivery, user, isExternal, isExternalReturn);


    } catch (err) {
      console.log('-> error on end delivery', err);
      throw err;
    }
  }

  async syncDeliveryItems(delivery, excludeItems) {
    try {

      if (!excludeItems || !excludeItems.length)
        return Promise.resolve();


      let excludedOrderLineIds = excludeItems.map(x => x.order_line_id.toString());

      let res = await this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(delivery._id)
      }, {
          $pull: {
            'order_details.$[].order_line_ids': {
              $in: excludedOrderLineIds
            }
          }
        })

      return Promise.resolve();

    } catch (err) {
      console.log('-> error on sync delivery items ', err);
      throw err;
    }

  }

  async makeDeliveryShelfCode(delivery_Id) {


    let hub = await new WarehouseModel(Delivery.test).getHub()
    if (!hub)
      throw errors.WarehouseNotFound;

    let deliveries = await this.DeliveryModel.aggregate([
      {
        $match: {
          $and: [
            {'delivery_start': {$exists: false}},
            {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(hub._id)}}
          ]
        }
      }
    ]);

    let foundDelivery = deliveries.find(d => d._id.toString() === delivery_Id.toString());
    if (!foundDelivery)
      throw errors.deliveryNotFound;

    if (foundDelivery.shelf_code)
      return Promise.resolve({
        shelf_code: foundDelivery.shelf_code,
        exist: true,
      });

    let shelfCodes = deliveries.filter(d => d.shelf_code).map(d => d.shelf_code).sort();
    let newCode = "";

    if (!shelfCodes.find(x => x === "A"))
      newCode = "A";
    else {
      let lastCode = shelfCodes[shelfCodes.length - 1];

      newCode = await require('./helpers').generateCode(lastCode,
        async (genValue) => {
          let preDelivery = await this.DeliveryModel.findOne({
            shelf_code: {
              $eq: genValue
            }
          })
          return !preDelivery;
        }
      );
    }

    foundDelivery = await this.DeliveryModel.findOneAndUpdate({
      _id: mongoose.Types.ObjectId(foundDelivery._id),
    }, {
        $set: {
          shelf_code: newCode,
        }
      }, {
        new: true,
      })
    if (!foundDelivery)
      return errors.deliveryNotFound;

    return Promise.resolve({
      shelf_code: foundDelivery.shelf_code,
      exist: false,
    });
  }

  async getActiveDeliveryByOrderLineId(orderLineId) {

    try {
      return this.DeliveryModel.findOne({
        $and: [
          {'order_details.order_line_ids': mongoose.Types.ObjectId(orderLineId)},
          {
            $or: [
              {'tickets.status': {$ne: _const.DELIVERY_STATUS.started}},
              {
                $and: [
                  {'tickets.status': {$eq: _const.DELIVERY_STATUS.started}},
                  {'tickets.status': {$ne: _const.DELIVERY_STATUS.ended}},
                ]
              }
            ]
          }
        ]
      }).lean();
    } catch (err) {
      console.log('-> error on get delivery by order line id', err);
      throw err;
    }

  }

  async safeRemoveOrderLineFromDelivery(orderLineId) {
    try {
      // remove order line from active delivery if exists and is not started yet
      let foundDelivery = await this.getActiveDeliveryByOrderLineId(orderLineId);
      if (foundDelivery) {
        // if order line is on delivery it should wait to be delivered to destination
        if (foundDelivery.tickets.map(x => x.status).includes(_const.DELIVERY_STATUS.started))
          return Promise.resolve();

        return this.removeOrderLineFromDelivery(foundDelivery, orderLineId);
      }

    } catch (err) {
      console.log('-> error on safe remove order line from delivery');
      throw err;
    }
  }

  async removeOrderLineFromDelivery(delivery, orderLineId) {
    try {

      /**
       * if delivery is external and contains only this order line,
       * whole delivery must be deleted
       */
      if (delivery.order_details.length === 1 &&
        delivery.order_details[0].order_line_ids.length === 1) {
        return this.DeliveryModel.deleteOne({
          _id: mongoose.Types.ObjectId(delivery._id)
        });
      }

      delivery.order_details.forEach(x => {
        let index = x.order_line_ids.findIndex(x => x.toString() === orderLineId.toString())
        if (index !== -1) {
          x.order_line_ids.splice(index, 1)
        }

      })

       delivery.order_details = delivery.order_details.filter(x => x.order_line_ids.length);

      return this.DeliveryModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(delivery._id)
      }, {
          'order_details': delivery.order_details
        }, {new: true})

    } catch (err) {
      console.log('-> errro on removing order line from delivery', err);
      throw err;
    }

  }

  async assignToReturn(address, order, orderLine, userId, preCheck) {
    try {

      let hub = await new WarehouseModel(this.test).getHub();

      let foundDelivery = null;
      try {

        foundDelivery = await this.initiate(order, orderLine, {
          customer: {
            _id: order.customer_id,
            address
          }
        }, {
            warehouse_id: hub._id
          }, userId, preCheck);



      } catch (err) {
      }

      return Promise.resolve(foundDelivery); // in pre check delivery might exist (including current order and order line or not)

    } catch (err) {
      console.log('-> error on get active return delivery', err);
      throw err;
    }
  }

  async setEvidence(body, file, delivery_evidence_id) {
    try {

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
    } catch (err) {
      console.log('-> ');
      throw err;
    }

  }


  async makeReturnToCentral(order, orderLine, user) {
    try {

      const warehouseModel = new WarehouseModel(this.test);

      const central = (await warehouseModel.getAll()).find(x => !x.has_customer_pickup && !x.is_hub);
      const hub = (await warehouseModel.getAll()).find(x => !x.has_customer_pickup && x.is_hub);

      if (!central || !hub)
        throw errors.WarehouseNotFound;

      let foundDelivery = await this.initiate(order, orderLine,
        {
          warehouse_id: hub._id
        },
        {
          warehouse_id: central._id
        }, hub._id)
      if (!foundDelivery)
        throw error.deliveryNotFound;

      return Promise.resolve(foundDelivery);
    } catch (err) {
      console.log('-> error on make return to central', err);
      throw err;
    }

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

}

Delivery.test = false;
module.exports = Delivery;