const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const helpers = require('./helpers');
const socket = require('../socket');
const _const = require('./const.list');
const env = require('../env');
const OfflineModel = require('./offline.model');

class TicketAction extends Ticket {

  constructor(test) {
    this.test = test;
    super(this.test);
  }
  
  onlineWarehouse(body, user) {

    return new OfflineModel(Order.test).requestOnlineWarehouse(body.orderId, body.orderLineId, user)
      .then(res => this.setTciket(body.orderId, body.orderLineId, _const.ORDER_STATUS.WaitForOnlineWarehouse, user.warehouse_id, user.id))
  }
  
  invoice(body, user) {
    
    return new OfflineModel(Order.test).requestInvoice(body.orderId, body.orderLineId, user.warehouse_id, user.id)
  .then(res => this.setTciket(body.orderId, body.orderLineId, _const.ORDER_STATUS.WaitForInvoice , user.warehouse_id, user.id))
}

  internalDelivery(body, order, user) {

    if (!body.toWarehouseId || !mongoose.Types.ObjectId(body.toWarehouseId))
      return Promise.reject(error.invalidId);

    return this.closeCurrentTicket(body.orderId, body.orderLineId, user.id)
      .then(res => {

        return this.addNewTicket(body.orderId, body.orderLineId, _const.ORDER_STATUS.InternalDelivery, body.toWarehouseId);
      })
      .then(res => {
        return this.pushMessage(body.toWarehouseId, {
          type: _const.ORDER_STATUS.InternalDelivery,
          data: {
            orderId: body.orderId,
            orderLineId: body.orderLineId
          }
        })
      })
      .then(res => {
        return this.pushMessage(user.warehouse_id, {
          type: _const.ORDER_STATUS.InternalDelivery,
          data: {
            orderId: body.orderId,
            orderLineId: body.orderLineId
          }
        })
      })

  }

  receive(body, order, user) {

    let requestInvoice = false;
    return new WarehouseModel(Order.test).getAllWarehouses()
      .then(res => {
        let agentWarehouse = res.find(x => x._id.toString() === user.warehouse_id);
        let destionationWarehouse = res.find(x => x.address._id.toString() === order.address._id.toString());

        if (!agentWarehouse)
          return Promise.reject(error.WarehouseNotFound);

        if (order.is_collect && !destionationWarehouse)
          return Promise.reject(error.WarehouseNotFound);


        requestInvoice = false;

        if (order.is_collect) {
          requestInvoice = agentWarehouse._id.toString() === destionationWarehouse._id.toString();
        } else {
          requestInvoice = agentWarehouse.is_center;
        }


        if (!requestInvoice && (!body.toWarehouseId || !mongoose.Types.ObjectId(body.toWarehouseId))) // case of internal delivery to another warehosue
          return Promise.reject(error.warehouseIdRequired);

        return this.closeCurrentTicket(body.orderId, body.orderLineId, user.id)
      })
      .then(res => {
        return this.addNewTicket(body.orderId, body.orderLineId, _const.ORDER_STATUS.Receive, user.warehouse_id);
      })
      .then(res => {
        if (requestInvoice) {
          return this.setManualTicket('invoice', body, user);
        } else {
          return this.setManualTicket('internalDelivery', body, user);
        }
      })
      .then(res => {
        return this.pushMessage(user.warehouse_id, {
          type: requestInvoice ? _const.ORDER_STATUS.WaitForInvoice : _const.ORDER_STATUS.InternalDelivery,
          data: {
            orderId: body.orderId,
            orderLineId: body.orderLineId
          }
        })
      })
  }

  deliver(body, order, user) {

    return this.closeCurrentTicket(body.orderId, body.orderLineId, user.id)
      .then(res => {
        return this.addNewTicket(body.orderId, body.orderLineId, _const.ORDER_STATUS.ReadyToDeliver, user.warehouse_id);
      })
      .then(res => {
        return this.pushMessage(user.warehouse_id, {
          type: _const.ORDER_STATUS.ReadyToDeliver,
          data: {
            orderId: body.orderId,
            orderLineId: body.orderLineId
          }
        })
      })
  }

}

module.exports = TicketAction;

