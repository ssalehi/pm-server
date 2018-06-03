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

  requestOnlineWarehouse(body, user) {

    if (!body.orderId || !mongoose.Types.ObjectId.isValid(body.orderId) ||
      !body.orderLineId || !mongoose.Types.ObjectId.isValid(body.orderLineId) ||
      !body.barcode
    )
      return Promise.reject(error.invalidId);

    let foundOrder, foundOrderLine, foundInstance;
    const Order = require('./order.model');

    new Order(this.test).model.findById(mongoose.Types.ObjectId(body.orderId)).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.orderNotFound);

        foundOrder = res;

        foundOrderLine = res.order_lines.find(x => x._id.toString() === body.orderLineId);
        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        const foundActiveTicket = foundOrderLine.tickets.find(x =>
          !x.is_processed && (x.status === _const.ORDER_STATUS.default || x.status === _const.ORDER_STATUS.WaitForOnlineWarehouse))
        if (!foundActiveTicket)
          return Promise.reject(error.activeTicketNotFound);

        const Offline = require('./offline.model');

        return new Offline(this.test).requestOnlineWarehouse(body.orderId, body.orderLineId, body.barcode, user)
      })
      .then(res => {
        return super.setTicket(foundOrder, foundOrderLine, _const.ORDER_STATUS.WaitForOnlineWarehouse, user.id, user.warehouse_id)
      })
      .then(res => {
        socket.sendToNS(user.warehouse_id);
      })
  }

  requestInvoice(body, user) {

    let foundOrder, foundOrderLine, foundInstance;
    const Order = require('./order.model');
    const Offline = require('./offline.model');

    return new Order(this.test).model.findById(mongoose.Types.ObjectId(body.orderId)).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.orderNotFound);

        foundOrder = res;

        let isReady = true;
        foundOrder.order_lines.forEach(ol => {
          if (ol.tickets[ol.tickets.length - 1] !== _const.ORDER_STATUS.WaitForAggregation)
            isReady = false;
        });
        if (isReady) {
          const Offline = require('./offline.model');
          return new Offline(this.test).requestInvoice(body.orderId, user)
        }
        else {
          return Promise.reject(error.orderIsNotCompleted);
        }

      })
      .then(res => Promise.all(foundOrder.order_lines.map(ol => super.setTicket(foundOrder, ol, _const.ORDER_STATUS.WaitForInvoice, user.warehouse_id, user.id))))
      .then(res => {
        socket.sendToNS(user.warehouse_id);
      })
  }

}

module.exports = TicketAction;
