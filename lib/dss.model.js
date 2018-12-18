const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');
const DeliveryModel = require('./delivery.model');
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
      await super.setOrderAsWaitingForAggregation(order);

      let preferedWarehouse;
      if (order.is_collect) {
        preferedWarehouse = warehouses.filter(x => !x.is_hub).find(x => x.address._id.toString() === order.address._id.toString());
      }
      order.order_lines.forEach(x => {
        promises.push(() => this.ORP(order, x, warehouses, preferedWarehouse))
      });

      await promises.reduce((x, y) => x.then(y), Promise.resolve());

      return Promise.resolve('successfull');
    } catch (err) {
      console.log('-> error on satrt process');
      throw err;
    }

  }

  async ORP(order, order_line, warehouses, preferedWarehouse, renew = false) {

    try {

      let productInstance = await new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())

      if (!productInstance)
        throw error.productInstanceNotExist;

      let warehouse;

      if (preferedWarehouse) {
        warehouse =
          productInstance.inventory.find(x => {
            return x.warehouse_id.toString() === preferedWarehouse._id.toString() && (x.count - x.reserved > 0)
          }) ? preferedWarehouse : null;
      }

      if (!warehouse) {
        let filteredWarehouses = warehouses.filter(x => {
          let notPrefered = true;
          if (preferedWarehouse)
            notPrefered = preferedWarehouse._id.toString() !== x._id.toString();

          return !x.is_hub && notPrefered
        })

        for (let i = 0; i < filteredWarehouses.length; i++) {
          let foundInventory = productInstance.inventory.find(x => {
            return x.warehouse_id.toString() === filteredWarehouses[i]._id.toString() && (x.count - x.reserved > 0)
          });
          if (foundInventory) {
            warehouse = filteredWarehouses[i];
            break;
          }
        }
      }

      let receiver;
      if (!warehouse) {
        let sm = await super.setOrderLineAsNotExists(order, order_line);
        await this.afterNotExists(order, order_line, sm);
        receiver = sm._id;
      }
      else {
        await super.setOrderLineAsReserved(order, order_line, warehouse, renew);
        receiver = warehouse._id;
      }

      if (!this.test)
        socket.sendToNS(receiver);

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

        let Offline = require('./offline.model');
        await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), foundOrderLine._id.toString(), foundOrderLine.product_instance_id.toString(), user)
        await super.setOrderLineAsWatingForOnlineWarehouse(order, foundOrderLine, user.id, user.warehouse_id);

      }
      else if (lastTicket.status === _const.ORDER_LINE_STATUS.Delivered) { // scan is for received order line

        await super.setOrderLineAsReceived(order, foundOrderLine, user.id, user.warehouse_id);
        await this.afterReceive(order, foundOrderLine, user)
      }

      if (!this.test)
        socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> error on after scan', err);
      throw err;
    }
  }

  async afterOnlineWarehouseVerification(orderId, orderLineId, userId, warehouseId) {

    try {
      let foundOrder = await this.OrderModel.findById(mongoose.Types.ObjectId(orderId)).lean()
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

    } catch (err) {
      console.log('-> ', 'error after online warehouse verification');
      throw err;
    }
  }

  async afterSoldOut(order, orderLine, userId, warehouseId) {
    try {

      await super.setOrderLineAsVerfiedByOnlineWarhouse(order, orderLine, userId, warehouseId);
      if (!order.is_collect) {
        let hub = await new WarehouseModel(this.test).getHub();
        await new DeliveryModel(this.test).initiate(order, orderLine,
          {warehouse_id: mongoose.Types.ObjectId(warehouseId)},
          {warehouse_id: hub._id},
          warehouseId);

        await super.setOrderLineAsDeliverySet(order, orderLine, userId, warehouseId);
      }

      if (!this.test)
        socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after sold out');
      throw err;
    }
  }

  /**
   * this function is just used for 'to customer' deliveries (not return)
   * @param {*} delivery 
   * @param {*} userId is delvery agent id
   */
  async afterRequestForPackage(delivery, userId) {
    try {

      if (!delivery.from || !delivery.from.warehouse_id)
        throw error.invalidDeliveryInfo;

      if (delivery.to.customer) { // external delivery

      } else { // internal delivery

        let orderIds = [];
        let orderLineIds = [];
        delivery.order_details.forEach(x => {
          orderIds.push(x.order_id);
          orderLineIds = orderLineIds.concat(x.order_line_ids);
        })

        if (!orderIds || !orderLineIds || !orderIds.length || !orderLineIds.length)
          throw new Error('order or order lines not found');

        let foundOrders = await (this.OrderModel.find({
          _id: {
            $in: orderIds
          }
        }).lean());

        if (!foundOrders || !foundOrders.length)
          throw new Error('orders of delivery not found');

        orderLineIds = orderLineIds.map(x => x.toString());

        for (let i = 0; i < foundOrders.length; i++) {
          let order = foundOrders[i];
          for (let j = 0; j < order.order_lines.length; j++) {
            let orderLine = order.order_lines[j];
            if (!orderLine)
              throw new Error('order line not found');
            if (orderLineIds.includes(orderLine._id.toString())) {
              await super.setOrderLineAsFinalCheck(order, orderLine, userId, delivery.from.warehouse_id)
            }
          }
        }

      }

    } catch (err) {
      console.log('-> error on after request for package', err);
      throw err;
    }
  }

  async afterFinalCheck(order, product, user) {
    try {
      if (!order)
        throw error.orderNotFound;

      const foundOrderLine = order.order_lines.find(x => {

        if (x.product_instance_id.toString() === product.instance._id.toString()) {
          const lastTicket = x.tickets && x.tickets.length ? x.tickets[x.tickets.length - 1] : null;
          return lastTicket &&
            !lastTicket.is_processed &&
            lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
            lastTicket.status === _const.ORDER_LINE_STATUS.FinalCheck
        } else
          return false;
      })
      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;

      if (!lastTicket || lastTicket.is_processed)
        throw error.activeTicketNotFound;

      if (!order.is_collect) {

        // recheck for delivery
        let hub = await new WarehouseModel().getHub();

        let foundDelivery = await new DeliveryModel(this.test).initiate(order, foundOrderLine,
          {warehouse_id: mongoose.Types.ObjectId(user.warehouse_id)},
          {warehouse_id: hub._id},
          user.warehouse_id);

        // check weather order line is assined to current requested delivery or is assinged to next day delivery
        if (foundDelivery.tickets[foundDelivery.tickets.length - 1].status !== _const.DELIVERY_STATUS.requestPackage) {
          if (!this.test)
            socket.sendToNS(user.warehouse_id)

          return Promise.resolve();
        }

        await super.setOrderLineAsReadyToDeliver(order, foundOrderLine, user.id, foundDelivery.delivery_agent);
      }

      if (!this.test)
        socket.sendToNS(user.warehouse_id)

    } catch (err) {
      console.log('-> after final check', err);
      throw err;
    }
  }


  async afterDeliveryStarted(delivery, user, preCheck = false) {
    try {
      let scannedItems = await super.getInternalDeliveryAgentOrderLines(user.id);

      /**
       * [
       *  {
       *    order_id: ...
       *    order_line_id: ...
       *  }, 
       *  ...
       * ]
       */
      let deliveryOrderLines = [];
      delivery.order_details.forEach(x => {
        x.order_line_ids.forEach(y => {
          deliveryOrderLines.push({
            _id: x.order_id,
            order_line_id: y
          })
        })
      })

      let matchedItems = [];
      let excludeItems = [];

      deliveryOrderLines.forEach(x => {
        if (scannedItems.find(y => y.order_line_id.toString() === x.order_line_id.toString()))
          matchedItems.push(x);
        else
          excludeItems.push(x)
      });

      if (preCheck)
        return Promise.resolve(matchedItems);


      if (excludeItems)
        await new DeliveryModel(this.test).syncDeliveryItems(delivery, excludeItems);

      for (let i = 0; i < matchedItems.length; i++) {

        const OrderModel = require('./order.model');

        let foundOrder = await new OrderModel(this.test).getById(matchedItems[i]._id);
        if (!foundOrder)
          throw error.orderNotFound;

        let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === matchedItems[i].order_line_id.toString());
        if (!foundOrderLine)
          throw error.orderLineNotFound;

        await super.setOrderLineAsOnDelivery(foundOrder, foundOrderLine, user.id, user.id);
      }

    } catch (err) {
      console.log('-> error on after delivery started', err);
      throw err;
    }
  }

  async afterDeliveryEnded(delivery, user) {
    try {

      let receiver_id;
      if (delivery.to.warehouse_id) {
        receiver_id = delivery.to.warehouse_id;
      } else if (delivery.to.customer && delivery.to.customer._id)
        receiver_id = delivery.to.customer._id;
      else
        throw error.invalidDeliveryInfo;

      for (let i = 0; i < delivery.order_details.length; i++) {
        let order = {_id: delivery.order_details[i].order_id};
        for (let j = 0; j < delivery.order_details[i].order_line_ids.length; j++) {
          let orderLine = {_id: delivery.order_details[i].order_line_ids[j]};
          await super.setOrderLineAsDelivered(order, orderLine, user.id, receiver_id)
        }
      }

      if (!this.test && delivery.to.warehouse_id)
        socket.sendToNS(delivery.to.warehouse_id);

    } catch (err) {
      console.log('-> error on after delivey ended ', err);
      throw err;
    }
  }



  async afterReceive(order, orderLine, user) {
    try {
      if (!order.is_collect) {


      } else {

      }
    } catch (err) {
      console.log('-> error on after receive', err);
      throw err;
    }
  }
  //     let warehouses = await new WarehouseModel(this.test).getAll();
  //     const is_hub = warehouses.find(x => x.is_hub)._id.toString() === warehouseId.toString();

  //     if (is_hub) {
  //       order = result.order;
  //       orderLine = result.orderLine;

  //       let isCompleted = await this.checkOrderAggregation(order, hub._id)

  //       if (order.is_collect) {
  //         if (isCompleted) {

  //           await Promise.all(order.order_lines
  //             .filter(el => el.tickets.length && el.tickets.slice(-1)[0].receiver_id.toString() === hub._id.toString())
  //             .map(ol => super.setTicket(order, ol, _const.ORDER_LINE_STATUS.ReChecked, user.warehouse_id, user.warehouse_id)));

  //           await this.makeDelivery(order, orderLine, user);

  //         } else {
  //           await super.setTicket(order, null, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id, null, false, true);
  //         }
  //       }

  //     } else { // is shop

  //       if (!order.is_collect)
  //         throw error.noAccess;

  //       let isCompleted = await this.checkOrderAggregation(order, user.warehouse_id);

  //       if (isCompleted) {
  //         await super.setTicket(order, null, _const.ORDER_STATUS.ReadyForInvoice, user.warehouse_id, user.warehouse_id, null, false, true);
  //       }
  //     }

  //     if (!this.test)
  //       socket.sendToNS(user.warehouse_id);

  //     return Promise.resolve();
  //   } catch (err) {
  //     console.log('-> error on after receive', err);
  //     throw err;
  //   }
  // }


  async afterInvoiceVerification(orderId, invoiceNo, userId, warehouseId) {

    try {
      let destination;

      let warehouses = await new WarehouseModel(this.test).getAll()

      let hub = warehouses.find(x => x.is_hub);

      if (warehouseId.toString() === hub._id.toString() && res.is_collect)
        throw error.noAccess;

      let foundOrder = await this.OrderModel.findOne({
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

      await this.OrderModel.findOneAndUpdate({
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

  // async afterMismatch(orders, user) {
  //   try {

  //     const Ticket = require('./ticket.model');
  //     const TicketModel = new Ticket(this.test);

  //     let warehouses = await new WarehouseModel(this.test).getAll();

  //     let exceptionIds = warehouses
  //       .filter(x => x._id.toString() === user.warehouse_id.toString())
  //       .map(x => x._id.toString());

  //     for (let i = 0; i < orders.length; i++) {
  //       let order = orders[i];
  //       await TicketModel.setTicket(order, order.order_lines, _const.ORDER_LINE_STATUS.CustomerCancel, user.warehouse_id, user.warehouse_id);
  //       if (order.is_collect && !exceptionIds.includes(order.address._id.toString())) {
  //         exceptionIds.push(order.address._id.toString());
  //       };
  //       await this.ORP(order, order.order_lines, warehouses, exceptionIds, true);
  //     }
  //     // await orders.map(order => {
  //     //   return async () => {
  //     //     try {
  //     //       // there is only one order line in each order
  //     //       await TicketModel.setTicket(order, order.order_lines, _const.ORDER_LINE_STATUS.CustomerCancel, user.warehouse_id, user.warehouse_id);
  //     //       if (order.is_collect && !exceptionIds.includes(order.address._id.toString())) {
  //     //         exceptionIds.push(order.address._id.toString());
  //     //       };
  //     //       return this.ORP(order, order.order_lines, warehouses, exceptionIds, true);
  //     //     } catch (err) {
  //     //       console.log('-> ', 'error on renew');
  //     //       throw err;
  //     //     }
  //     //   }
  //     // }).reduce((x, y) => x.then(y), Promise.resolve());;

  //     return Promise.resolve();
  //   } catch (err) {
  //     console.log('-> ', 'after mismatch error');
  //     throw err;
  //   }
  // }

  async afterNotExists(order, orderLine, sm) {
    try {

    } catch (err) {
      console.log('-> error on after not exists: ', err);
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

