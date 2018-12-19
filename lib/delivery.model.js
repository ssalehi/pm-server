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

  async initiate(order, orderLine, from, to, receiverId) {
    try {

      const isExternal = !!(to.customer);
      const isReturn = !!(from.customer);

      if ((isExternal && from.customer) || (isReturn && to.customer)) {
        throw errors.invalidDeliveryInfo;
      }

      const fromCondition = from.customer ? {'from.customer._id': {$eq: mongoose.Types.ObjectId(from.customer._id)}} : {'from.warehouse_id': {$eq: mongoose.Types.ObjectId(from.warehouse_id)}};
      const toCondition = to.customer ? {'to.customer._id': {$eq: mongoose.Types.ObjectId(to.customer._id)}} : {'to.warehouse_id': {$eq: mongoose.Types.ObjectId(to.warehouse_id)}};

      let currentDay = moment(moment().format('YYYY-MM-DD'));
      let nextDay = moment(moment().add('d', 1).format('YYYY-MM-DD'));

      let deliveries = await (this.DeliveryModel.find({
        $and: [
          {
            start: {$gte: currentDay.toDate()}
          },
          fromCondition,
          toCondition,
        ]
      }).lean());


      if (deliveries && deliveries.length) { // previous delivery exists
        if (!isExternal && deliveries.length > 2)
          throw new Error('At most 2 deliveries could be found for interal cases (current day and next day)')

        for (let i = 0; i < deliveries.length; i++) {
          let delivery = deliveries[i];

          let validStatus = [
            _const.DELIVERY_STATUS.default,
            _const.DELIVERY_STATUS.agentSet,
            _const.DELIVERY_STATUS.requestPackage,
          ]
          let lastTickt = delivery.tickets[delivery.tickets.length - 1];
          if (!validStatus.includes(lastTickt.status))
            continue;

          const foundOrder = delivery.order_details.find(o => {
            return o.order_id.toString() === order._id.toString()
          });

          if (foundOrder) {
            let foundOrderLine = foundOrder.order_line_ids.find(x => {
              return x.toString() === orderLine._id.toString()
            });
            if (!foundOrderLine)
              foundOrder.order_line_ids.push(orderLine._id);
            else
              return Promise.resolve(delivery);
          }
          else {
            if (!isExternal) // this is alawys second order assignment for a pre existing delivery
              throw new Error("external delivery cannot have more than one order");

            delivery.order_details.push({
              order_id: order._id,
              order_line_ids: [orderLine._id],
            });
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

        }
        let startDay;
        if (isExternal) {
          startDay = currentDay;
        }
        else {
          // cound not assing to any exisitng delivery
          if (deliveries.length === 2) // both current and next days deliveries are invalid
            throw new Error('no suiatble delivery is found to assign current order and order line to');
          else { // there is one delivery which is not open anymore
            if (moment(deliveries[0].start).format('YYYY-MM-DD') !== currentDay.format('YYYY-MM-DD'))
              throw new Error('found delivery is not related to current day')
            startDay = nextDay;
          }
        }
        return this.makeNewDelivery(order, orderLine, startDay, from, to, isExternal, receiverId);
      }
      else {
        return this.makeNewDelivery(order, orderLine, currentDay, from, to, isExternal, receiverId);
      }

    } catch (err) {
      console.log('-> error on initiate delivery', err);
    }
  }

  async setDeliveryAgent(body, user) {
    try {

      if (!body.deliveryId || !body.agentId)
        throw new Error('delivery id and agent id are required to set delivery agent')

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
        throw new Error('selected agent has incomplete delivery')


      if (!deliveryId)
        throw errors.deliveryIdIsRequired;

      let delivery = await (this.DeliveryModel.findOne({
        _id: mongoose.Types.ObjectId(deliveryId)
      }).lean());


      if (!delivery)
        throw errors.deliveryNotFound;

      let currentDate = moment();
      let deliveryDate = moment(delivery.start).format('YYYY-MM-DD');

      if (currentDate.format('YYYY-MM-DD') !== deliveryDate || // delivery starts neither in current day nor prev
        currentDate.isBefore(deliveryDate)
      )
        throw new Error('delivery is not started yet');

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

      let currentDate = moment();
      let deliveryDate = moment(delivery.start).format('YYYY-MM-DD');

      if (currentDate.format('YYYY-MM-DD') !== deliveryDate || // delivery starts neither in current day nor prev
        currentDate.isBefore(deliveryDate)
      )
        throw new Error('delivery is not started yet');


      let DSS = require('./dss.model');

      let matchedItems = await new DSS(this.test).afterDeliveryStarted(delivery, user, preCheck);

      if (preCheck)
        return matchedItems;

      await this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(deliveryId)
      }, {
          $set: {
            delivery_start: moment()
          }
        })

      return super.setDeliveryAsStarted(delivery, user.id);

    } catch (err) {
      console.log('-> erro on start delivery', err);
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


      await this.DeliveryModel.update({
        _id: mongoose.Types.ObjectId(deliveryId)
      }, {
          $set: {
            delivery_end: moment()
          }
        })

      let receiverId = delivery.to.customer && delivery.to.customer._id ?
        delivery.to.customer._id :
        delivery.to.warehouse_id

      await super.setDeliveryAsEnded(delivery, user.id, receiverId)

      let DSS = require('./dss.model');
      return new DSS(this.test).afterDeliveryEnded(delivery, user);


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

      console.log(excludedOrderLineIds);

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