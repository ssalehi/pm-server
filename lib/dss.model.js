const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const helpers = require('./helpers');
const socket = require('../socket');
const _const = require('./const.list');
const env = require('../env');
const AgentModel = require('./agent.model');


class DSS {

  constructor(test) {
    this.test = test;
  }

  startProcess(order) {
    return new WarehouseModel(this.test).getWarehouses()
      .then(warehouses => {
        if (!order)
          return Promise.reject(error.orderNotFound);

        if (!order.address)
          return Promise.reject(error.addressIsRequired);

        let promises = [];

        if (!order.is_collect) {
          order.order_lines.forEach(x => {
            promises.push(() => this.ORP(order, x, warehouses))
          });
        }
        else {
          order.order_lines.forEach(x => {
            promises.push(() => this.processCC(order, x, warehouses))
          });
        }
        return promises.reduce((x, y) => x.then(y), Promise.resolve());
      });


  }


  processCC(order, order_line, warehouses) {
    let CCWarehouse = warehouses.find(x => x.address._id.toString() === order.address._id.toString());

    const Ticket = require('./ticket.model');

    return new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);

        let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === CCWarehouse._id.toString() && (x.count - x.reserved > 0));
        if (foundInventory) {

          return new Ticket(this.test).setAsReserved(order, order_line, CCWarehouse);

        }
        else {
          return this.ORP(order, order_line, warehouses, CCWarehouse._id, false) // ORP should return promise not function here
        }
      })
  }

  ORP(order, order_line, warehouses, exceptionId = null) {
    if (exceptionId && exceptionId.toString() === warehouses.find(x => x.is_center)._id.toString())
      return Promise.reject(error.centralWarehouseORPFailed);

    let filteredWarehouses = exceptionId ? warehouses.filter(x => x._id.toString() !== exceptionId.toString()) : warehouses;

    const Ticket = require('./ticket.model');

    return new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);

        let warehouse;

        for (let i = 0; i < filteredWarehouses.length; i++) {
          let foundInventory = productInstance.inventory.find(x => {
            return x.warehouse_id.toString() === filteredWarehouses[i]._id.toString() && (x.count - x.reserved > 0)
          });
          if (foundInventory) {
            warehouse = filteredWarehouses[i];
            break;
          }
        }
        if (!warehouse) {
          return new Ticket(this.test).setAsNotExists(order, order_line);
        }
        else {
          return new Ticket(this.test).setAsReserved(order, order_line, warehouse);
        }

      });
  }

  afterOnlineWarehouseVerification(orderId, orderLineId, userId, warehouseId) {

    const OrderModel = require('./order.model');
    const TicketModel = require('./ticket.model');
    let foundOrder;
    return new OrderModel(this.test).model.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(res => {
        foundOrder = res;
        if (!foundOrder)
          return Promise.reject(error.orderNotFound);

        let foundOrderLine = order.order_lines.find(x => x._id.toString() === orderLineId);

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        let foundActiveTicket = foundOrderLine.tickets.find(x => !x.is_processed)
        if (!foundActiveTicket || foundActiveTicket.status !== _const.ORDER_STATUS.WaitForOnlineWarehouse)
          return Promise.reject(error.noAccess);

        return new TicketModel(this.test).setAsSoldOut(foundOrder, foundOrderLine, userId, warehouseId)
      })
      .then(res => this.afterVerificationDecision(foundOrder, foundOrderLine, user))
      .then(res => {
        socket.sendToNS(warehouseId);
      })

  }
  afterVerificationDecision(order, orderLine, user) {
    return new WarehouseModel(this.test).getAll()
      .then(warehouses => {

        const currentWarehouse = warehouses.find(x => x._id.toString() === user.warehouse_id);

        if (order.is_collect && currentWarehouse.address._id.toString() === order.address._id.toString()) {
          return this.checkOrderCompletion(order, warehouseId)
            .then(isCompleted => {
              if (isCompleted) {
                const Ticket = require('./ticket.model');
                const TicketModel = new Ticket(this.test);
                return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.WaitForInvoice, user.warehouse_id, user.warehouse_id)))
              }
              else {
                return new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id);
              }
            });
        } else
          return new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.ReadyForInternalDelivery, user.id);

      })
  }

  newReceive(barcode, user) {

    if (!barcode)
      return Promise.reject(error.barcodeNotFound);

    const Ticket = require('./ticket.model');
    const TicketAction = require('./ticket_action.model');

    const OrderModel = require('./order.model');

    let foundProduct;
    return new ProductModel(this.test).getInstanceByBarcode(barcode)
      .then(res => {
        foundProduct = res
        return new OrderModel(this.test).model.findOne({
          'order_lines': {
            $elemMatch: {
              'product_instance_id': mongoose.Types.ObjectId(foundProduct.instance._id),
              'tickets': {
                $elemMatch: {
                  'receiver_id': mongoose.Types.ObjectId(user.warehouse_id),
                  'status': _const.ORDER_STATUS.OnInternalDelivery,
                  'is_processed': false
                }
              }
            }
          }
        })
      })
      .then(order => {

        const foundOrderLine = order.order_lines.find(x => {
          if (x.product_instance_id.toString() === foundProduct.instance._id.toString()) {
            const foundTicket = x.tickets.find(y =>
              !x.is_processed &&
              y.status === _const.ORDER_STATUS.OnInternalDelivery &&
              x.receiver_id.toString() === user.warehouse_id)
            return !!foundTicket;
          } else
            return false;

        })
        return this.afterReceiveDecision(foundOrder, foundOrderLine, user)
      })
      .then(res => {
        socket.sendToNS(user.warehouse_id);
        return Promise.resolve(foundProduct)
      })
  }

  afterReceiveDecision(order, orderLine, user) {

    const Ticket = require('./ticket.model');

    return new WarehouseModel(this.test).getAll()
      .then(res => {

        const hub = res.find(x => x.is_hub);
        if (user.warehouse_id === hub._id.toString()) { // is hub

          return this.checkOrderCompletion(order, hub._id)
            .then(isCompleted => {

              if (isCompleted) {
                if (order.is_collect) {
                  const TicketModel = new Ticket(this.test);
                  return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInternalDelivery, user.warehouse_id, user.warehouse_id)))
                } else {
                  return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id)))
                }

              } else {
                return new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id);
              }

            })

        } else { // is shop

          return this.checkOrderCompletion(order, user.warehouse_id)
            .then(isCompleted => {
              if (isCompleted) {
                const TicketModel = new Ticket(this.test);
                return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id)))
              } else {
                return new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id);
              }
            });

        }
      })
  }

  checkOrderCompletion(order, warehouseId) {

    return new WarehouseModel(this.test).getAll()
      .then(warehouses => {

        const hub = warehouses.find(x => x.is_hub);

        if (warehouseId.toString() === hub._id.toString()) { // is hub

          if (order.is_collect) {
            const destination = warehouses.find(x => x.address._id.toString() === order.address._id.toString());
            if (!destination)
              return Promise.reject(error.WarehouseNotFound);

            return Promise.resolve(order.order_lines.every(ol => !!ol.tickets.find(x => !x.is_processed
              && (x.receiver_id.toString() === hub._id.toString() || x.receiver_id.toString() === destination._id.toString()) && // order lines are either in hub or destination shop
              x.status === _const.ORDER_STATUS.WaitForAggregation)));

          } else {
            return Promise.resolve(order.order_lines.every(ol => !!ol.tickets.find(x => !x.is_processed
              && x.receiver_id.toString() === hub._id.toString() &&
              x.status === _const.ORDER_STATUS.WaitForAggregation)));

          }

        } else { // is shop  => order is C&C
          if (!order.is_collect)
            return Promise.reject(error.invalidOrderProcess)

          return Promise.resolve(order.order_lines.every(ol => !!ol.tickets.find(x => !x.is_processed
            && x.receiver_id.toString() === hub._id.toString() &&
            x.status === _const.ORDER_STATUS.WaitForAggregation)));
        }
      })

  }

}


module.exports = DSS;

