const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');

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
          return this.ORP(order, order_line, warehouses, CCWarehouse._id)
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
    let foundOrder, foundOrderLine;
    return new OrderModel(this.test).model.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(res => {
        foundOrder = res;
        if (!foundOrder)
          return Promise.reject(error.orderNotFound);

        foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === orderLineId.toString());

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;
        if (!lastTicket || lastTicket.is_processed || lastTicket.status !== _const.ORDER_STATUS.WaitForOnlineWarehouse)
          return Promise.reject(error.noAccess);

        return new TicketModel(this.test).setAsSoldOut(foundOrder, foundOrderLine, userId, warehouseId)
      })
      .then(res => this.afterSoldOut(foundOrder, foundOrderLine, userId, warehouseId))
      .then(res => {
        socket.sendToNS(warehouseId);
      })

  }

  afterInvoiceVerification(orderId, invoiceNo, userId, warehouseId) {

    const OrderModel = require('./order.model');
    let foundOrder;
    let warehouses, hub, destination;
    const TicketModel = require('./ticket.model');

    return new WarehouseModel(this.test).getAll()
      .then(res => {
        warehouses = res;
        hub = warehouses.find(x => x.is_hub);
        if (warehouseId.toString() === hub._id.toString() && order.is_collect)
          return Promise.reject(error.noAccess);

        return new OrderModel(DSS.test).model.findOne({
          $and: [
            {_id: mongoose.Types.ObjectId(orderId)},
            {invoice_no: {$exists: false}}
          ]
        })
      })
      .then(res => {

        if (!res)
          return Promise.reject(error.orderNotFound);

        foundOrder = res;

        if (foundOrder.is_collect)
          destination = warehouses.find(x => x.address._id.toString() === foundOrder.address._id.toString())

        if (destination && destination._id.toString() !== warehouseId.toString())
          return Promise.reject(error.noAccess);

        return new OrderModel(DSS.test).model.findOneAndUpdate({
          _id: foundOrder._id
        }, {
            invoice_no: invoiceNo
          })
      })
      .then(res => {
        return Promise.all(foundOrder.order_lines.map(orderLine => new TicketModel(DSS.test).setTicket(foundOrder, orderLine, _const.ORDER_STATUS.InvoiceVerified, userId, warehouseId)))
      })
      .then(res => {
        if (foundOrder.is_collect) {
          return Promise.all(foundOrder.order_lines.map(orderLine => new TicketModel(DSS.test).setTicket(foundOrder, orderLine, _const.ORDER_STATUS.Delivered, userId, warehouseId, null, true)))
        } else {
          return Promise.all(foundOrder.order_lines.map(orderLine => new TicketModel(DSS.test).setTicket(foundOrder, orderLine, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId)))
        }
      })
      .then(res => {
        socket.sendToNS(warehouseId);
      })


  }

  afterSoldOut(order, orderLine, userId, warehouseId) {
    const Ticket = require('./ticket.model');
    const TicketModel = new Ticket(this.test);

    return this.checkOrderAggregation(order, orderLine, warehouseId)
      .then(isCompleted => {
        if (isCompleted) {
          return this.afterAggregation(order, warehouseId, userId);
        }
        else {
          return TicketModel.setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, userId, warehouseId);
        }
      });
  }

  afterScan(order, product, user) {
    if (!order)
      return Promise.reject(error.orderNotFound);

    const foundOrderLine = order.order_lines.find(x => {
      if (x.product_instance_id.toString() === product.instance._id.toString()) {
        const lastTicket = x.tickets && x.tickets.length ? x.tickets[x.tickets.length - 1] : null;
        return lastTicket && !lastTicket.is_processed && lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
          [
            _const.ORDER_STATUS.default,
            _const.ORDER_STATUS.WaitForOnlineWarehouse,
            _const.ORDER_STATUS.ReadyForInvoice,
            _const.ORDER_STATUS.Delivered,
          ].includes(lastTicket.status);
      } else
        return false;
    })
    if (!foundOrderLine)
      return Promise.reject(error.orderLineNotFound);

    const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;

    if (!lastTicket || lastTicket.is_processed)
      return Promise.reject(error.activeTicketNotFound);

    if (lastTicket.status === _const.ORDER_STATUS.default || lastTicket.status === _const.ORDER_STATUS.WaitForOnlineWarehouse) { // scan is for newly paid order line
      const TicketAction = require('./ticket_action.model');
      return new TicketAction(DSS.test).requestOnlineWarehouse(order, foundOrderLine, user);
    }
    else if (lastTicket.status === _const.ORDER_STATUS.Delivered) { // scan is for received order line
      return this.afterReceive(order, foundOrderLine, user)
    }
  }

  afterReceive(order, orderLine, user) {

    const Ticket = require('./ticket.model');

    return new WarehouseModel(this.test).getAll()
      .then(res => {

        const hub = res.find(x => x.is_hub);
        if (user.warehouse_id === hub._id.toString()) { // is hub

          return this.checkOrderAggregation(order, orderLine, hub._id)
            .then(isCompleted => {
              if (isCompleted) {
                const TicketModel = new Ticket(this.test);

                if (order.is_collect) {
                  return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyToDeliver, user.warehouse_id, user.warehouse_id)))
                } else {
                  return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id)))
                }
              } else {
                return new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id);
              }

            })

        } else { // is shop

          if (!order.is_collect)
            return Promise.reject(error.noAccess);

          return this.checkOrderAggregation(order, orderLine, user.warehouse_id)
            .then(isCompleted => {
              const TicketModel = new Ticket(this.test);
              if (isCompleted) {
                return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id)))
              } else {
                return new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id);
              }
            });

        }
      })
      .then(res => {
        socket.sendToNS(user.warehouse_id);
      })
  }

  checkOrderAggregation(order, orderLine, warehouseId) {

    const checkAllInWarehouse = () => {

      if (order.order_lines.length === 1)
        return Promise.resolve(true);

      return Promise.resolve(order.order_lines.filter(ol => {
        const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;
        if (!lastTicket)
          return false;

        return lastTicket.receiver_id.toString() === warehouseId.toString() &&
          ol._id.toString() !== orderLine._id.toString(); // all orderlines except the current one which are related to current warehouse
      })
        .every(ol => {
          const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;
          if (!lastTicket)
            return false;

          return lastTicket.status === _const.ORDER_STATUS.WaitForAggregation
        }))
    }

    const checkAllMustBeInWarehouse = (targetId) => {

      if (order.order_lines.length === 1)
        return Promise.resolve(true);

      return Promise.resolve(order.order_lines.every(ol => {
        const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

        let ticketCond = ol._id.toString() !== orderLine._id.toString() ?
          lastTicket.status === _const.ORDER_STATUS.WaitForAggregation : true;

        return lastTicket &&
          !lastTicket.is_processed &&
          (lastTicket.receiver_id.toString() === targetId.toString()) && // all order lines are in hub
          ticketCond // all order lines except current one have wait for aggregation ticket
      }));
    }

    const checkAllExceptInDist = () => {
      return Promise.resolve(order.order_lines.every(ol => {
        const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

        if (!lastTicket || lastTicket.is_processed)
          return false;

        let ticketCond = ol._id.toString() !== orderLine._id.toString() ?
          lastTicket.status === _const.ORDER_STATUS.WaitForAggregation : true;

        return lastTicket.receiver_id.toString() === hub._id.toString() ||
          lastTicket.receiver_id === destination._id.toString() && // all order lines are wheather in current warehouse or in destination
          ticketCond; // all order lines except current one have wait for aggregation ticket
      }))
    }

    return new WarehouseModel(this.test).getAll()
      .then(warehouses => {

        const destination = order.is_collect ? warehouses.find(x => x.address._id.toString() === order.address._id.toString()) : order.address;
        const hub = warehouses.find(x => x.is_hub);
        if (!destination || !hub)
          return Promise.reject(error.WarehouseNotFound);

        if (order.is_collect) { // is collect ?
          const is_destination = destination._id.toString() === warehouseId.toString();

          if (is_destination) { // is in destination
            return checkAllMustBeInWarehouse(destination._id);
          } else {
            const is_hub = hub._id.toString() === warehouseId.toString();
            if (is_hub) { // is in hub
              return checkAllExceptInDist();

            } else { // some where not in hub or destination
              return checkAllInWarehouse();
            }
          }

        } else { // not C&C 
          const is_hub = hub._id.toString() === warehouseId.toString();
          if (is_hub) { // is in hub
            return checkAllMustBeInWarehouse(hub._id);
          }
          else {  // not in hub
            return checkAllInWarehouse();
          }
        }

      });
  }
  afterAggregation(order, warehouseId, userId) {


    const TicketModel = require('./ticket.model');

    if (order.is_collect)
      return Promise.all(order.order_lines.map(ol => new TicketModel(DSS.test).setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, userId, warehouseId)))
    else {
      return new WarehouseModel(DSS.test).getAll()
        .then(warehouses => {

          const hub = warehouses.find(x => x.is_hub);

          if (warehouseId.toString() === hub._id.toString()) {
            return Promise.all(order.order_lines.map(ol => new TicketModel(DSS.test).setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, userId, warehouseId)))

          } else {
            return Promise.all(order.order_lines.map(ol => new TicketModel(DSS.test).setTicket(order, ol, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId)))

          }
        })

    }
  }
}


module.exports = DSS;

