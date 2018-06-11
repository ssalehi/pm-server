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

  async return(body) {
    const AgentModel = require('./agent.model');

    if (!mongoose.Types.ObjectId.isValid(body.order._id) || !mongoose.Types.ObjectId.isValid(body.orderLine._id))
      return Promise.reject(error.invalidId);

    try {
      // find receiver
      const receiver = await new AgentModel(this.test).getSalesManager();
      // find order for check tickets have is_processed true
      let _orderLine = await models['Order' + (this.test ? 'Test' : '')].findOne({
        "order_lines._id": mongoose.Types.ObjectId(body.orderLine._id),
      }, {
        "order_lines.$": mongoose.Types.ObjectId(body.orderLine._id)
      });
      _orderLine = _orderLine.order_lines[0].tickets.filter(ticket => ticket.is_processed === true);
      // dont have tickets in processing
      if (!_orderLine.length) {
        return super.addNewTicket(
          body.order,
          body.orderLine,
          _const.ORDER_STATUS.Return,
          receiver._id,
          body.desc);
      } else throw error.ticketAlreadyInProcess
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
  
}

module.exports = TicketAction;
