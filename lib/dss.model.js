const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');
const Delivery = require('./delivery.model');
const Ticket = require('./ticket.model')

class DSS extends Ticket {

  constructor(test) {
    super(test);
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

      await super.setOrderAsWaitingForAggregation(order);

      return Promise.resolve('successfull');
    } catch (err) {
      console.log('-> error on satrt process');
      throw err;
    }

  }

  async processCC(order, order_line, warehouses) {
    try {
      let CCWarehouse = warehouses.filter(x => !x.is_hub).find(x => x.address._id.toString() === order.address._id.toString());

      let productInstance = await new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      if (!productInstance)
        throw error.productInstanceNotExist;

      let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === CCWarehouse._id.toString() && (x.count - x.reserved > 0));
      if (foundInventory) {
        return super.setOrderLineAsReserved(order, order_line, CCWarehouse);
      }
      else {
        return this.ORP(order, order_line, warehouses, [CCWarehouse._id])
      }
    } catch (err) {
      console.log('-> error on process cc');
      throw err;
    }
  }

  async ORP(order, order_line, warehouses, exceptionIds = null, renew = false) {

    try {

      let filteredWarehouses = exceptionIds && exceptionIds.length ? warehouses.filter(x => {
        let isException = exceptionIds.map(y => y.toString()).includes(x._id.toString());
        return !x.is_hub && !isException
      })
        : warehouses.filter(x => !x.is_hub);

      if (!filteredWarehouses || !filteredWarehouses.length)
        throw error.WarehouseNotFound;


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
        return super.setOrderLineAsNotExists(order, order_line);
      }
      else {
        await super.setOrderLineAsReserved(order, order_line, warehouse, renew)

        if (!renew) {
          let dest;
          if (order.is_collect) {
            dest = filteredWarehouses.find(x => x.address._id.toString() === order.address._id.toString());
            if (!dest && !exceptionIds)
              throw error.WarehouseNotFound;
          }
          if (!order.is_collect || (order.is_collect && (!dest || dest._id.toString() !== warehouse._id.toString())))
            return new Delivery(this.test).initiate(order, order_line._id, {warehouse_id: warehouse._id.toString()}, {warehouse_id: warehouses.find(el => el.is_hub)._id.toString()});
        }
        return Promise.resolve();
      }
    } catch (err) {
      console.log('-> error on ORP');
      throw err;
    }
  }

  async afterInboxScan(order, product, user) {
    try {
      if (!order)
        throw error.orderNotFound;

      const foundOrderLine = order.order_lines.find(x => {
        if (x.product_instance_id.toString() === product.instance._id.toString()) {
          const lastTicket = x.tickets && x.tickets.length ? x.tickets[x.tickets.length - 1] : null;
          return lastTicket && !lastTicket.is_processed && lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
            [
              _const.ORDER_LINE_STATUS.default,
              _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
              _const.ORDER_LINE_STATUS.Renew,
              _const.ORDER_LINE_STATUS.Delivered,
            ].includes(lastTicket.status);
        } else
          return false;
      })
      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;

      if (!lastTicket || lastTicket.is_processed)
        throw error.activeTicketNotFound;

      if (lastTicket.status === _const.ORDER_LINE_STATUS.default ||
        lastTicket.status === _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse ||
        lastTicket.status === _const.ORDER_LINE_STATUS.Renew) { // scan is for newly paid or renewed order line
        const TicketAction = require('./ticket_action.model');
        return new TicketAction(this.test).requestOnlineWarehouse(order, foundOrderLine, user);
      }
      else if (lastTicket.status === _const.ORDER_LINE_STATUS.Delivered) { // scan is for received order line
        return this.afterReceive(order, foundOrderLine, user)
      }
    } catch (err) {
      console.log('-> error on after scan', err);
      throw err;
    }
  }

  async afterReceive(order, orderLine, user) {
    try {

      let warehouses = await new WarehouseModel(this.test).getAll();
      const is_hub = warehouses.find(x => x.is_hub)._id.toString() === warehouseId.toString();

      if (is_hub) {

        let isLastTicket = !order.is_collect;
        let result = await super.setTicket(order, orderLine, _const.ORDER_LINE_STATUS.Recieved, user.id, hub._id, null, isLastTicket);
        order = result.order;
        orderLine = result.orderLine;

        let isCompleted = await this.checkOrderAggregation(order, hub._id)

        if (order.is_collect) {
          if (isCompleted) {


            super.setTicket(order, null, _const.ORDER_STATUS.ReadyForInvoice, user._id, user.warehouse_id, null, false, true);

            await Promise.all(order.order_lines
              .filter(el => el.tickets.length && el.tickets.slice(-1)[0].receiver_id.toString() === hub._id.toString())
              .map(ol => super.setTicket(order, ol, _const.ORDER_LINE_STATUS.DeliverySet, user.warehouse_id, user.warehouse_id)));

            await this.makeDelivery(order, orderLine, user);

          } else {
            await super.setTicket(order, null, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id, null, false, true);
          }
        }

      } else { // is shop

        if (!order.is_collect)
          throw error.noAccess;

        let isCompleted = await this.checkOrderAggregation(order, user.warehouse_id);

        if (isCompleted) {
          await super.setTicket(order, null, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id, null, false, true);
        }
      }

      if (!this.test)
        socket.sendToNS(user.warehouse_id);

      return Promise.resolve();
    } catch (err) {
      console.log('-> error on after receive', err);
      throw err;
    }
  }

  async afterOnlineWarehouseVerification(orderId, orderLineId, userId, warehouseId) {

    try {
      const OrderModel = require('./order.model');
      let foundOrder = await new OrderModel(this.test).model.findById(mongoose.Types.ObjectId(orderId)).lean()
      if (!foundOrder)
        throw error.orderNotFound;

      let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === orderLineId.toString());

      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;
      if (!lastTicket || lastTicket.is_processed || lastTicket.status !== _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse)
        throw error.noAccess;

      await new ProductModel(this.test).reduceInstanceInventory(foundOrderLine.product_id.toString(), foundOrderLine.product_instance_id.toString(), warehouseId);
      await this.afterSoldOut(foundOrder, foundOrderLine, userId, warehouseId);

      if (!this.test)
        socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after online warehouse verification');
      throw err;
    }
  }

  async afterSoldOut(order, orderLine, userId, warehouseId) {
    try {

      let warehouses = new WarehouseModel(this.test).getAll();
      let is_hub = warehouses.find(x => x.is_hub)._id.toString() === warehouseId.toString();

      let is_destination;
      if (order.is_collect) {
        destination = warehouses.find(x => x._id.toString() === warehouseId.toString());
      }

      /**
       * order line ticket must be closed if:
       * 1) order line is delivered to hub and order is not C&C
       * 2) order line is either delivered to or scanned in destination warehouse 
       */
      let isLastTicket = (is_hub && !order.is_collect) || (order.is_collect && is_destination);

      await super.setOrderLineAsVerfiedByOnlineWarhouse(order, orderLine, userId, warehouseId, isLastTicket);

      let isCompleted = await this.checkOrderAggregation(order, warehouseId);



      if (isCompleted) {
        if (is_destination) {
          await super.setOrderAsReadyForInvoice(order, userId, warehouseId);
        }
        else {
          // make new delivery here for order so that agents can see in their list
        }
      }

    } catch (err) {
      console.log('-> ', 'error after sold out');
      throw err;
    }
  }

  async afterInvoiceVerification(orderId, invoiceNo, userId, warehouseId) {

    try {
      const OrderModel = require('./order.model');
      let destination;

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


      await super.setTicket(foundOrder, null, _const.ORDER_STATUS.InvoiceVerified, userId, warehouseId, null, false, true);

      if (foundOrder.is_collect) {
        await super.setTicket(foundOrder, null, _const.ORDER_STATUS.Delivered, userId, warehouseId, null, true, true);
      } else {
        // set order as ready to deliver so that delivery agent can start delivery
        await super.setTicket(foundOrder, null, _const.ORDER_STATUS.ReadyToDeliver, userId, warehouseId, null, false, true);
      }

      if (!this.test)
        socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after invoice verification');
      throw err;
    }

  }

  async afterMismatch(orders, user) {
    try {

      const Ticket = require('./ticket.model');
      const TicketModel = new Ticket(this.test);

      let warehouses = await new WarehouseModel(this.test).getAll();

      let exceptionIds = warehouses
        .filter(x => x._id.toString() === user.warehouse_id.toString())
        .map(x => x._id.toString());

      for (let i = 0; i < orders.length; i++) {
        let order = orders[i];
        await TicketModel.setTicket(order, order.order_lines, _const.ORDER_LINE_STATUS.CustomerCancel, user.warehouse_id, user.warehouse_id);
        if (order.is_collect && !exceptionIds.includes(order.address._id.toString())) {
          exceptionIds.push(order.address._id.toString());
        };
        await this.ORP(order, order.order_lines, warehouses, exceptionIds, true);
      }
      // await orders.map(order => {
      //   return async () => {
      //     try {
      //       // there is only one order line in each order
      //       await TicketModel.setTicket(order, order.order_lines, _const.ORDER_LINE_STATUS.CustomerCancel, user.warehouse_id, user.warehouse_id);
      //       if (order.is_collect && !exceptionIds.includes(order.address._id.toString())) {
      //         exceptionIds.push(order.address._id.toString());
      //       };
      //       return this.ORP(order, order.order_lines, warehouses, exceptionIds, true);
      //     } catch (err) {
      //       console.log('-> ', 'error on renew');
      //       throw err;
      //     }
      //   }
      // }).reduce((x, y) => x.then(y), Promise.resolve());;

      return Promise.resolve();
    } catch (err) {
      console.log('-> ', 'after mismatch error');
      throw err;
    }
  }

  async makeDelivery(order, orderLine, warehouses, user) {
    try {
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
      return new Delivery(this.test).makeDeliveryShelfCode(delivery._id);

    } catch (err) {
      console.log('-> error on make delivery');
      throw err;
    }
  }

  async checkOrderAggregation(order, warehouseId) {

    try {

      const checkAll = (targetId, isDestination) => {

        if (order.order_lines.length === 1)
          return Promise.resolve(true);

        return Promise.resolve(order.order_lines.every(ol => {
          const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

          if (!lastTicket || lastTicket.is_processed)
            return false;

          let condition = isDestination ?
            (lastTicket.ORDER_LINE_STATUS.Received || lastTicket.ORDER_LINE_STATUS.OnlineWarehouseVerified)
            :
            lastTicket.ORDER_LINE_STATUS.Received;

          return condition &&
            (lastTicket.receiver_id.toString() === targetId.toString());
        }));
      }

      const checkAllExceptInDist = () => {
        return Promise.resolve(order.order_lines.every(ol => {
          const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

          if (!lastTicket)
            return false;

          // all order lines are whether in hub or in destination
          return lastTicket.receiver_id.toString() === hub._id.toString() ||
            lastTicket.receiver_id.toString() === destination._id.toString();
        }))
      }

      let hub = null;
      let destination = null;

      let warehouses = await new WarehouseModel(this.test).getAll()
      destination = order.is_collect ? warehouses.find(x => x.address._id.toString() === order.address._id.toString()) : order.address;
      hub = warehouses.find(x => x.is_hub);

      if (!destination || !hub)
        throw error.WarehouseNotFound;

      const is_hub = hub._id.toString() === warehouseId.toString();

      if (order.is_collect) { // is collect ?
        const is_destination = destination._id.toString() === warehouseId.toString();

        if (is_destination) { // is in destination
          return checkAll(destination._id, true);
        } if (is_hub) { // is in hub
          return checkAllExceptInDist();
        }

      } else { // not C&C
        if (is_hub) { // is in hub
          return checkAll(hub._id, false);
        }
      }


    } catch (err) {
      console.log('-> error on check aggregation');
      throw err;
    }

  }

}


module.exports = DSS;

