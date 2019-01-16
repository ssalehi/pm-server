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

  async makeNewDelivery(order, orderLine, start, from, to, isExternal, receiverId) {

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
    if (isExternal) {
      delivery.slot = order.time_slot;
      delivery.expire_date = order.duration_days ? moment(order.order_time, 'YYYY-MM-DD').add(order.duration_days, 'days') : null;
    }

    delivery = await this.DeliveryModel.create(delivery);
    return super.setDeliveryAsDefault(delivery, mongoose.Types.ObjectId(receiverId));
  }

  async initiate(order, orderLine, from, to, receiverId, findPreDelivery = false) {
    try {

      if ((from.customer && !from.customer.address) || (to.customer && !to.customer.address))
        throw new Error('customer address is not set for dleivery point');

      const isExternal = !!(to.customer);
      const isExternalReturn = !!(from.customer);

      if ((isExternal && from.customer) || (isExternalReturn && to.customer)) {
        throw errors.invalidDeliveryInfo;
      }

      const fromCondition = from.customer ?
        {'from.customer.address._id': {$eq: mongoose.Types.ObjectId(from.customer.address._id)}} :
        {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(from.warehouse_id)}};

      const toCondition = to.customer ?
        {
          $and: [
            {'to.customer.address._id': {$eq: mongoose.Types.ObjectId(to.customer.address._id)}},
            {'slot': {$eq: order.time_slot}}
          ]
        } :
        {'to.warehouse_id': {$eq: mongoose.Types.ObjectId(to.warehouse_id)}};



      let preActiveDelivery = await this.DeliveryModel.aggregate([
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
        }
      ]);

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
        let nextDay = moment(moment().add('d', 1).format('YYYY-MM-DD'));

        let startDay;
        if (isExternal) {
          startDay = currentDay;
        }
        else {
          let foundCurrentDayClosedInternalDelivery = await this.DeliveryModel.findOne({
            $and: [
              fromCondition,
              toCondition,
              {delivery_start: {$gte: currentDay}}
            ]
          });

          startDay = foundCurrentDayClosedInternalDelivery ? nextDay : currentDay;
        }

        return this.makeNewDelivery(order, orderLine, startDay, from, to, isExternal, receiverId);
      }


    } catch (err) {
      console.log('-> error on initiate delivery', err);
      throw err;
    }
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

      if (!isExternal || (isExternal && !isRetrun)) {
        await this.DeliveryModel.update({
          _id: mongoose.Types.ObjectId(foundDelivery._id)
        }, {
            $set: {
              delivery_agent: null
            }
          });

        await super.setDeliveryAsDefault(foundDelivery, foundDelivery.from.warehouse_id, user.id);
      } else if (isExternal && isRetrun) {

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

      if (!isExternal) { // internal delivery
        let currentDate = moment(moment().format('YYYY-MM-DD'));
        let deliveryDate = moment(moment(delivery.start).format('YYYY-MM-DD'));

        if (currentDate.format('YYYY-MM-DD') !== deliveryDate.format('YYYY-MM-DD') && // delivery starts neither in current day nor prev
          currentDate.isBefore(deliveryDate)
        )
          throw new Error('delivery is not started yet');
      }


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

      let currentDate = moment(moment().format('YYYY-MM-DD'));
      let deliveryDate = moment(moment(delivery.start).format('YYYY-MM-DD'));

      if (currentDate.format('YYYY-MM-DD') !== deliveryDate.format('YYYY-MM-DD') && // delivery starts neither in current day nor prev
        currentDate.isBefore(deliveryDate)
      )
        throw new Error('delivery is not started yet');


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
            delivery_end: moment()
          }
        })


      let receiverId;

      if (delivery.to.customer) {
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


    let hub = await new Warehouse(Delivery.test).getHub()
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
          {'tickets.status': {$ne: _const.DELIVERY_STATUS.started}}
        ]
      }).lean();
    } catch (err) {
      console.log('-> error on get delivery by order line id', err);
      throw err;
    }

  }

  async removeOrderLineFromDelivery(delivery, orderLineId) {
    try {

      /**
       * if delivery is external in which only this order line is,
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