const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const helpers = require('./helpers');
const socket = require('../socket');
const _const = require('./const.list');
const env = require('../env');
const Ticket = require('./ticket.model');
const models = require('../mongo/models.mongo')

class TicketAction extends Ticket {

  constructor(test) {
    super(test);
    this.test = test;
  }

  requestOnlineWarehouse(order, orderLine, user) {

    if (!orderLine.product_instance_id)
      return Promise.reject(error.barcodeNotFound);

    const Offline = require('./offline.model');

    return new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user)
      .then(res => {
        return super.setTicket(order, orderLine, _const.ORDER_STATUS.WaitForOnlineWarehouse, user.id, user.warehouse_id)
      })
      .then(res => {
        socket.sendToNS(user.warehouse_id);
      })
  }

  async returnOrderLine (body) {
    const AgentModel = require('./agent.model');

    if (!mongoose.Types.ObjectId.isValid(body.orderId) || !mongoose.Types.ObjectId.isValid(body.orderLineId))
      return Promise.reject(error.invalidId);

    try {
      // find receiver
      const receiver = await new AgentModel(this.test).getSalesManager();
      // find order for check tickets have is_processed true
      // let _orderLine = await models['Order' + (this.test ? 'Test' : '')].findOne({
      //   "_id": mongoose.Types.ObjectId(body.orderId),
      // });
      let _order = await models['Order' + (this.test ? 'Test' : '')].aggregate([{
        $match: {
          "_id": mongoose.Types.ObjectId(body.orderId),
        }
      },
      {
        $unwind: {
          path: '$order_lines',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          "order_lines._id": mongoose.Types.ObjectId(body.orderLineId)
        }
      },
      {
        $match: {
           'order_lines.tickets.status': _const.ORDER_STATUS.Delivered
        }
      },
      {
        $project: {
          _id: 1,
          order_line: "$order_lines"
        }
      },
      
    ]).exec().then(res => res[0]);

      if (_order) {
        return super.addNewTicket(
          _order,
          _order.order_line,
          _const.ORDER_STATUS.Return,
          receiver._id,
          body.desc);
      } else throw error.ticketStatusNotDelivered
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

  async cancelOrderLine (body, user) {
    const AgentModel = require('./agent.model');
    const CustomerModel = require('./customer.model');

    if (!mongoose.Types.ObjectId.isValid(body.orderId) || !mongoose.Types.ObjectId.isValid(body.orderLineId))
      return Promise.reject(error.invalidId);

    try {
      const receiver = await new AgentModel(this.test).getSalesManager();
      let _order = await models['Order' + (this.test ? 'Test' : '')].aggregate([{
          $match: {
            "_id": mongoose.Types.ObjectId(body.orderId),
          }
        },
        {
          $unwind: {
            path: '$order_lines',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            "order_lines._id": mongoose.Types.ObjectId(body.orderLineId)
          }
        },
        {
          $match: {
            $and: [
              { 'order_lines.tickets.status': {$ne: _const.ORDER_STATUS.OnDelivery }},
              { 'order_lines.tickets.status': {$ne: _const.ORDER_STATUS.Delivered} },
            ]
          }
        },
        {
          $project: {
            _id: 1,
            order_line: "$order_lines"
          }
        },
        
      ]).exec().then(res => res[0]);
      

      // Dont have ticket status that state OnDelivery or Delivered
      if (_order) {
        // set balance
        const userBalance = user.balance + _order.order_line.paid_price;  // get orderline paid_price
        await super.setTicket(
          _order,
          _order.order_line,
          _const.ORDER_STATUS.Cancel,
          user._id,
          receiver._id,
        );
        const userUpdate = await new CustomerModel(this.test).updateByOfflineSystem(user.mobile_no, user.loyalty_points, userBalance);
        if (userUpdate) return Promise.resolve({result: true});
      } else throw error.ticketAlreadySetOnDelivery
    } catch (err) {
      console.log(err);
      throw err;
    }
  }

}

module.exports = TicketAction;