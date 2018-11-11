const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');
const Delivery = require('./delivery.model');

class DSS {

  constructor(test) {
    this.test = test;
  }

  async startProcess(order) {

    try {
      let warehouses = await new WarehouseModel(this.test).getAll()
      if (!order)
        throw error.orderNotFound;

      if (!order.address)
        throw error.addressIsRequired;

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
      await promises.reduce((x, y) => x.then(y), Promise.resolve());
      return Promise.resolve('successfull');
    } catch (err) {
      console.log('-> error on new scan');
      throw err;
    }
  }

  async processCC(order, order_line, warehouses) {
    try {
      let CCWarehouse = warehouses.filter(x => !x.is_hub).find(x => x.address._id.toString() === order.address._id.toString());

      const Ticket = require('./ticket.model');

      let productInstance = await new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      if (!productInstance)
        throw error.productInstanceNotExist;

      let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === CCWarehouse._id.toString() && (x.count - x.reserved > 0));
      if (foundInventory) {
        return new Ticket(this.test).setAsReserved(order, order_line, CCWarehouse);
      }
      else {
        return this.ORP(order, order_line, warehouses, CCWarehouse._id)
      }
    } catch (err) {
      console.log('-> error on process cc');
      throw err;
    }
  }

  async ORP(order, order_line, warehouses, exceptionId = null) {

    try {
      // todo: check first condition in filter
      if (exceptionId && !warehouses.filter(el => el.has_customer_pickup && !el.is_hub)
        .map(x => x._id.toString()).includes(exceptionId.toString()))
        throw error.invalidWarehouseORPFailed;

      let filteredWarehouses = exceptionId ? warehouses.filter(x => x._id.toString() !== exceptionId.toString() && !x.is_hub)
        : warehouses.filter(x => !x.is_hub);

      const Ticket = require('./ticket.model');

      let productInstance = await new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())

      if (!productInstance)
        throw error.productInstanceNotExist;

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
        await new Ticket(this.test).setAsReserved(order, order_line, warehouse)
        let dest;
        if (order.is_collect) {
          dest = filteredWarehouses.find(x => x.address._id.toString() === order.address._id.toString());
          if (!dest && !exceptionId)
            throw error.WarehouseNotFound;
        }
        if (!order.is_collect || (order.is_collect && (!dest || dest._id.toString() !== warehouse._id.toString())))
          return new Delivery(this.test).initiate(order, order_line._id, {warehouse_id: warehouse._id.toString()}, {warehouse_id: warehouses.find(el => el.is_hub)._id.toString()});

        return Promise.resolve();
      }
    } catch (err) {
      console.log('-> error on ORP');
      throw error;
    }
  }

  async afterOnlineWarehouseVerification(orderId, orderLineId, userId, warehouseId) {

    try {
      const OrderModel = require('./order.model');
      const TicketModel = require('./ticket.model');
      let foundOrder = await new OrderModel(this.test).model.findById(mongoose.Types.ObjectId(orderId)).lean()
      if (!foundOrder)
        throw error.orderNotFound;

      let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === orderLineId.toString());

      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;
      if (!lastTicket || lastTicket.is_processed || lastTicket.status !== _const.ORDER_STATUS.WaitForOnlineWarehouse)
        throw error.noAccess;

      await new TicketModel(this.test).setAsSoldOut(foundOrder, foundOrderLine, userId, warehouseId);
      await this.afterSoldOut(foundOrder, foundOrderLine, userId, warehouseId);

      socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after online warehouse verification');
      throw err;
    }
  }

  async afterInvoiceVerification(orderId, invoiceNo, userId, warehouseId) {

    try {
      const OrderModel = require('./order.model');
      let destination;
      const TicketModel = require('./ticket.model');

      let warehouses = await new WarehouseModel(this.test).getAll()

      let hub = warehouses.find(x => x.is_hub);

      if (warehouseId.toString() === hub._id.toString() && res.is_collect)
        throw error.noAccess;

      let foundOrder = await new OrderModel(this.test).model.findOne({
        $and: [
          {_id: mongoose.Types.ObjectId(orderId)},
          {invoice_no: {$exists: false}}
        ]
      })
      if (!foundOrder)
        throw error.orderNotFound;

      if (foundOrder.is_collect)
        destination = warehouses.find(x => x.address._id.toString() === foundOrder.address._id.toString())

      if (destination && destination._id.toString() !== warehouseId.toString())
        throw error.noAccess;

      await new OrderModel(this.test).model.findOneAndUpdate({
        _id: foundOrder._id
      }, {
          invoice_no: invoiceNo
        });

      await Promise.all(foundOrder.order_lines.map(orderLine => new TicketModel(this.test).setTicket(foundOrder, orderLine, _const.ORDER_STATUS.InvoiceVerified, userId, warehouseId)))

      if (foundOrder.is_collect) {
        await Promise.all(foundOrder.order_lines.map(orderLine => new TicketModel(this.test).setTicket(foundOrder, orderLine, _const.ORDER_STATUS.Delivered, userId, warehouseId, null, true)))
      } else {
        await Promise.all(foundOrder.order_lines.map(orderLine => new TicketModel(this.test).setTicket(foundOrder, orderLine, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId)));
      }

      socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after invoice verification');
      throw err;
    }

  }

  async afterSoldOut(order, orderLine, userId, warehouseId) {
    try {
      const Ticket = require('./ticket.model');
      const TicketModel = new Ticket(this.test);

      let result = await TicketModel.setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, userId, warehouseId)
      order = result.order;
      orderLine = result.orderLine;
      let isCompleted = await this.checkOrderAggregation(order, warehouseId)
      if (isCompleted) {
        let warehouses = await new WarehouseModel(this.test).getAll()
        const dest = warehouses.find(x => x.address._id.toString() === order.address._id.toString());

        if (order.is_collect && dest._id.toString() === warehouseId.toString())
          return Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, userId, warehouseId)));
        else
          return Promise.all(order.order_lines
            .filter(el => el.tickets.length && el.tickets.slice(-1)[0].receiver_id.toString() === warehouseId.toString())
            .map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId)));
      }
      else {
        return TicketModel.setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, userId, warehouseId);
      }

    } catch (err) {
      console.log('-> ', 'error after sold out');
      throw err;
    }
  }

  async afterScan(order, product, user) {
    try {
      if (!order)
        throw error.orderNotFound;

      const foundOrderLine = order.order_lines.find(x => {
        if (x.product_instance_id.toString() === product.instance._id.toString()) {
          const lastTicket = x.tickets && x.tickets.length ? x.tickets[x.tickets.length - 1] : null;
          return lastTicket && !lastTicket.is_processed && lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
            [
              _const.ORDER_STATUS.default,
              _const.ORDER_STATUS.WaitForOnlineWarehouse,
              _const.ORDER_STATUS.Renew,
              _const.ORDER_STATUS.Delivered,
            ].includes(lastTicket.status);
        } else
          return false;
      })
      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;

      if (!lastTicket || lastTicket.is_processed)
        throw error.activeTicketNotFound;

      if (lastTicket.status === _const.ORDER_STATUS.default || lastTicket.status === _const.ORDER_STATUS.WaitForOnlineWarehouse) { // scan is for newly paid order line
        const TicketAction = require('./ticket_action.model');
        return new TicketAction(this.test).requestOnlineWarehouse(order, foundOrderLine, user);
      }
      else if (lastTicket.status === _const.ORDER_STATUS.Delivered) { // scan is for received order line
        return this.afterReceive(order, foundOrderLine, user)
      }
      else if (lastTicket.status === _const.ORDER_STATUS.Renew) { // scan is for renew action made by sales manager
        // do here...
      }
    } catch (err) {
      console.log('-> error on after scan', err);
      throw err;
    }
  }

  async afterReceive(order, orderLine, user) {
    try {
      const Ticket = require('./ticket.model');

      let warehouses = await new WarehouseModel(this.test).getAll();
      const hub = warehouses.find(x => x.is_hub);

      if (user.warehouse_id === hub._id.toString()) { // is hub

        let result = await new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id, hub._id)
        order = result.order;
        orderLine = result.orderLine;

        let isCompleted = await this.checkOrderAggregation(order, hub._id)

        if (isCompleted) {
          const TicketModel = new Ticket(this.test);
          if (order.is_collect) {
            await Promise.all(order.order_lines
              .filter(el => el.tickets.length && el.tickets.slice(-1)[0].receiver_id.toString() === hub._id.toString())
              .map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyToDeliver, user.warehouse_id, user.warehouse_id)));
          } else {
            await Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id)))
          }
        }

        const destWarehoues = warehouses.find(el => el.address._id.toString() === order.address._id.toString());
        let delivery = await new Delivery(this.test).initiate(
          order,
          orderLine._id,
          {warehouse_id: user.warehouse_id},
          destWarehoues ? {warehouse_id: destWarehoues._id} : {
            customer: {
              _id: order.customer_id,
              address_id: order.address._id
            }
          });
        await new Delivery(this.test).makeDeliveryShelfCode(delivery._id);

      } else { // is shop

        if (!order.is_collect)
          throw error.noAccess;

        let result = await new Ticket(this.test).setTicket(order, orderLine, _const.ORDER_STATUS.WaitForAggregation, user.id, user.warehouse_id)
        order = result.order;
        orderLine = result.orderLine;
        let isCompleted = await this.checkOrderAggregation(order, user.warehouse_id)
        const TicketModel = new Ticket(this.test);
        if (isCompleted) {
          await Promise.all(order.order_lines.map(ol => TicketModel.setTicket(order, ol, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id)))
        }
      }

      socket.sendToNS(user.warehouse_id);
      return Promise.resolve();
    } catch (err) {
      console.log('-> error on after receive', err);
      throw err;
    }
  }

  checkOrderAggregation(order, warehouseId) {

    const checkAllInWarehouse = () => {

      if (order.order_lines.length === 1)
        return Promise.resolve(true);

      return Promise.resolve(order.order_lines.filter(ol => {
        const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;
        if (!lastTicket)
          return false;

        return lastTicket.receiver_id.toString() === warehouseId.toString();
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

        return lastTicket &&
          !lastTicket.is_processed &&
          lastTicket.status === _const.ORDER_STATUS.WaitForAggregation &&
          (lastTicket.receiver_id.toString() === targetId.toString());
      }));
    }

    const checkAllExceptInDist = () => {
      return Promise.resolve(order.order_lines.every(ol => {
        const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

        if (!lastTicket || lastTicket.is_processed)
          return false;

        return lastTicket.status === _const.ORDER_STATUS.WaitForAggregation &&
          (lastTicket.receiver_id.toString() === hub._id.toString() ||
            lastTicket.receiver_id.toString() === destination._id.toString());  // all order lines are whether in hub or in destination)
      }))
    }

    let hub = null;
    let destination = null;

    return new WarehouseModel(this.test).getAll()
      .then(warehouses => {

        destination = order.is_collect ? warehouses.find(x => x.address._id.toString() === order.address._id.toString()) : order.address;
        hub = warehouses.find(x => x.is_hub);
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

}


module.exports = DSS;

