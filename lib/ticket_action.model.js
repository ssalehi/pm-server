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
  
}

module.exports = TicketAction;
