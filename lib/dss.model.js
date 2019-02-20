const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const socket = require('../socket');
const _const = require('./const.list');
const DeliveryModel = require('./delivery.model');
const Ticket = require('./ticket.model');
const Offline = require('./offline.model');

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
        preferedWarehouse = warehouses.filter(x => !x.is_hub).find(x => x._id.toString() === order.address.warehouse_id.toString());
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
        await this.afterNotExists(order, order_line);
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

      let foundOrderLine = this.findOrderLine(order, product, user);

      const lastTicket = this.getLastTicket(foundOrderLine);

      if ([
        _const.ORDER_LINE_STATUS.default,
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
        _const.ORDER_LINE_STATUS.Renew,
      ].includes(lastTicket.status)) { // scan is for newly paid or renewed order line

        if (foundOrderLine.cancel) {
          await this.onCanceledNewOrderLineScan(order, foundOrderLine, user);
        }
        else {
          await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), foundOrderLine._id.toString(), foundOrderLine.product_instance_id.toString(), user)
          await super.setOrderLineAsWatingForOnlineWarehouse(order, foundOrderLine, user.id, user.warehouse_id);
        }
      }
      else if (lastTicket.status === _const.ORDER_LINE_STATUS.Delivered) { // scan is for received order line

        let res = await super.setOrderLineAsReceived(order, foundOrderLine, user.id, user.warehouse_id);
        order = res.order;
        foundOrderLine = res.orderLine;

        let isReturn = foundOrderLine.tickets.map(x => x.status).includes(_const.ORDER_LINE_STATUS.ReturnRequested);

        if (foundOrderLine.cancel || isReturn) {
          await this.onCanceledDeliveredOrderLineScan(order, foundOrderLine, user, isReturn);
        }
        else
          return this.afterInternalReceive(order, foundOrderLine, user)

      } else if (lastTicket.status === _const.ORDER_LINE_STATUS.OnlineWarehouseVerified) { // when order line status is reset to be in inbox

        if (foundOrderLine.cancel) {
          await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), foundOrderLine._id.toString(), foundOrderLine.product_instance_id.toString(), user, true)
          await super.setOrderLineAsWatingForOnlineWarehouseCancel(order, foundOrderLine, user.id, user.warehouse_id);
        } else {

          return this.afterSoldOut(order, foundOrderLine, user.id, user.warehouse_id)
        }
      }
      if (!this.test)
        socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> error on after scan', err);
      throw err;
    }
  }

  getLastTicket(item) {
    try {
      const lastTicket = item.tickets && item.tickets.length ? item.tickets[item.tickets.length - 1] : null;
      if (!lastTicket || lastTicket.is_processed)
        throw error.activeTicketNotFound;

      return lastTicket;
    } catch (err) {
      console.log('-> error on get last ticket of order line', err);
      throw err;
    }

  }

  findOrderLine(order, product, user) {
    try {

      let foundOrderLine = order.order_lines.find(x => {

        try {

          if (x.product_instance_id.toString() === product.instance._id.toString()) {
            const lastTicket = this.getLastTicket(x);
            return lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
              [
                _const.ORDER_LINE_STATUS.default,
                _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
                _const.ORDER_LINE_STATUS.Renew,
                _const.ORDER_LINE_STATUS.Delivered,
                _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
              ].includes(lastTicket.status);
          } else
            return false;

        } catch (err) {
          return false;
        }

      })
      if (!foundOrderLine)
        throw error.orderLineNotFound;

      return foundOrderLine;
    } catch (err) {
      console.log('-> error on finding order line', err);
      throw err;
    }

  }

  async onCanceledNewOrderLineScan(order, orderLine, user) {
    try {

      const lastTicket = this.getLastTicket(orderLine);

      if (lastTicket.status === _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse) {
        await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user, true)
        await super.setOrderLineAsWatingForOnlineWarehouseCancel(order, orderLine, user.id, user.warehouse_id);
      } else if (lastTicket.status === _const.ORDER_LINE_STATUS.default) {

        await new ProductModel(this.test).setInventory(orderLine.product_id, orderLine.product_instance_id, lastTicket.receiver_id, null, 0, -1, null);
        await super.setOrderLineAsCanceled(order, orderLine, user._id, lastTicket.receiver_id);
      }
      return Promise.resolve();

    } catch (err) {
      console.log('-> error on after canceled order Line inbox scan', err);
      throw err;
    }
  }

  async onCanceledDeliveredOrderLineScan(order, orderLine, user, isReturn) {
    try {
      let OrderModel = require('./order.model');
      let CustomerModel = require('./customer.model');

      const warehouseModel = new WarehouseModel(this.test);
      const hub = (await warehouseModel.getAll()).find(x => !x.has_customer_pickup && x.is_hub);
      if (!hub)
        throw errors.WarehouseNotFound;

      if (user.warehouse_id !== hub._id.toString()) // scan in central warehouse or other shops
      {
        await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user, true)
        await super.setOrderLineAsWatingForOnlineWarehouseCancel(order, orderLine, user.id, user.warehouse_id);
      }
      else { // scan in hub
        if (isReturn) {
          if (!order.customer_id)
            throw new Error('guest orders cannot be returned');

          let addedBalance = await new OrderModel(this.test).calculateDetailedPrice(order, orderLine);
          await new CustomerModel(this.test).changeBalance(order.customer_id, addedBalance);
        }
        let foundDelivery = await new DeliveryModel(this.test).makeReturnToCentral(order, orderLine, user);

        await super.setOrderLineAsDeliverySet(order, orderLine, user.id, hub._id);
        if (foundDelivery.tickets[foundDelivery.tickets.length - 1].status === _const.DELIVERY_STATUS.requestPackage)
          await super.setOrderLineAsFinalCheck(order, orderLine, user.id, hub._id);

      }

      return Promise.resolve();
    } catch (err) {
      console.log('-> error on canceled delivered order line scan', err);
      throw err;
    }
  }

  async afterOnlineWarehouseResponse(orderId, orderLineId, userId, warehouseId, reverse = false) {

    try {
      let foundOrder = await this.OrderModel.findById(mongoose.Types.ObjectId(orderId)).lean()
      if (!foundOrder)
        throw error.orderNotFound;

      let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === orderLineId.toString());

      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = this.getLastTicket(foundOrderLine);

      if (![
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
        _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
        _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled,
      ].includes(lastTicket.status))
        throw error.noAccess;


      if (!reverse && lastTicket.status === _const.ORDER_LINE_STATUS.OnlineWarehouseVerified)
        return Promise.resolve('online warehouse verification has been done before')

      if (reverse && lastTicket.status === _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled)
        return Promise.resolve('online warehouse has canceled order line before')

      if (!reverse) {
        await new ProductModel(this.test).setInventory(foundOrderLine.product_id, foundOrderLine.product_instance_id, warehouseId, null, -1, -1, null);
      } else {
        await new ProductModel(this.test).setInventory(foundOrderLine.product_id, foundOrderLine.product_instance_id, warehouseId, null, 1, null, null);
      }

      if (!reverse) {
        foundOrderLine = (await super.setOrderLineAsVerfiedByOnlineWarhouse(foundOrder, foundOrderLine, userId, warehouseId)).orderLine;

        let index = foundOrder.order_lines.findIndex(x => x._id.toString() === foundOrderLine._id.toString());
        foundOrder.order_lines[index] = foundOrderLine;
        await this.afterSoldOut(foundOrder, foundOrderLine, userId, warehouseId);
      } else {
        await super.setOrderLineAsCanceled(foundOrder, foundOrderLine, userId, warehouseId);
        if (!this.test)
          socket.sendToNS(warehouseId);
      }
    } catch (err) {
      console.log('-> ', 'error after online warehouse verification');
      throw err;
    }
  }

  async afterSoldOut(order, orderLine, userId, warehouseId) {
    try {

      if (orderLine.cancel) {
        let Offline = require('./offline.model');
        await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), foundOrderLine._id.toString(), foundOrderLine.product_instance_id.toString(), user, true)
        await super.setOrderLineAsWatingForOnlineWarehouseCancel(order, foundOrderLine, user.id, user.warehouse_id);
        if (!this.test)
          socket.sendToNS(warehouseId);

        return Promise.resolve();
      }

      if (!order.is_collect || (order.is_collect && order.address.warehouse_id.toString() !== warehouseId.toString())) {
        let hub = await new WarehouseModel(this.test).getHub();
        let delivery = await new DeliveryModel(this.test).initiate(order, orderLine,
          {warehouse_id: mongoose.Types.ObjectId(warehouseId)},
          {warehouse_id: hub._id},
          warehouseId);

        if (!delivery)
          throw error.deliveryNotFound;
        await super.setOrderLineAsDeliverySet(order, orderLine, userId, warehouseId);

        const lastTicket = this.getLastTicket(delivery);

        if (lastTicket.status === _const.DELIVERY_STATUS.requestPackage) {
          await super.setOrderLineAsFinalCheck(order, orderLine, userId, warehouseId);
        }
      }
      else {

        let res = await super.setOrderLineAsFinalCheck(order, orderLine, userId, warehouseId);
        order = res.order;

        let isAggregated = await this.checkOrderAggregation(order, warehouseId, [
          _const.ORDER_LINE_STATUS.Recieved,
          _const.ORDER_LINE_STATUS.ReadyToDeliver,
        ]);
        if (isAggregated) {
          for (let i = 0; i < order.order_lines.length; i++) {
            if (!order.order_lines[i].cancel)
              await super.setOrderLineAsFinalCheck(order, order.order_lines[i], userId, warehouseId)
          }
        }
      }
      if (!this.test)
        socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after sold out');
      throw err;
    }
  }

  async afterRequestForPackage(delivery, userId, isExternal, isExternalRetrun) {
    try {
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

      if (isExternal && !isExternalRetrun) {

        for (let i = 0; i < foundOrders.length; i++) {
          let isAggregated = await this.checkOrderAggregation(foundOrders[i], delivery.from.warehouse_id, [_const.ORDER_LINE_STATUS.Recieved]);
          if (!isAggregated)
            throw new Error('delivery contains not aggregated orders');

          let lastTicket = this.getLastTicket(foundOrders[i]);

          if (lastTicket.status !== _const.ORDER_STATUS.DeliverySet)
            throw new Error('delivery contains order whose "Delivery Set" ticket is not set for');
        }
      }

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
            if (isExternalRetrun) {
              await super.setOrderLineAsReadyToDeliver(order, orderLine, userId, userId);
            } else {
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

  async afterCancel(order, orderLine) {
    try {

      // remove order line from active delivery if exists and is not started yet
      const deliveryModel = new DeliveryModel(this.test);
      await deliveryModel.safeRemoveOrderLineFromDelivery(orderLine._id);


      let receiver = await this.resetOrderLineToLastTicket(order, orderLine);
      if (!receiver)
        return Promise.resolve();

      let hub = await new WarehouseModel(this.test).getHub();
      if (!hub)
        throw error.WarehouseNotFound;

      let isAggregated = await this.checkOrderAggregation(order, hub._id, [_const.ORDER_LINE_STATUS.Checked]);
      if (isAggregated)
        await super.setOrderAsWaitForInvoice(order, order.customer_id, hub._id);

      if (!this.test)
        socket.sendToNS(receiver);

    } catch (err) {
      console.log('-> erron on after cancel', err);
      throw err;
    }

  }

  async resetOrderLineToLastTicket(order, orderLine) {
    try {
      let lastDeliveredTicket = orderLine.tickets.slice().reverse().find(x => x.status === _const.ORDER_LINE_STATUS.Delivered);
      let verificationTicket = orderLine.tickets.find(x => x.status === _const.ORDER_LINE_STATUS.OnlineWarehouseVerified);

      let receiver;
      if (lastDeliveredTicket) {
        receiver = lastDeliveredTicket.receiver_id;
        await super.setOrderLineAsDelivered(order, orderLine, order.customer_id, receiver);
      } else if (verificationTicket) {
        receiver = verificationTicket.receiver_id;
        await super.setOrderLineAsVerfiedByOnlineWarhouse(order, orderLine, order.customer_id, verificationTicket.receiver_id);
      } else
        return Promise.resolve();

      return Promise.resolve(receiver)

    } catch (err) {
      console.log('-> error on reset order line to last ticket', err);
      throw err;
    }
  }

  async afterFinalCheck(order, product, user, isExternal = false, isCC = false, isReturn = false) {
    try {
      if (!order)
        throw error.orderNotFound;

      let hub = await new WarehouseModel(this.test).getHub();
      if (!hub)
        throw error.WarehouseNotFound;

      let foundOrderLine = order.order_lines.find(x => {

        try {

          if (x.product_instance_id.toString() === product.instance._id.toString()) {

            if (x.cancel && !isReturn)
              return false;

            const lastTicket = this.getLastTicket(x);

            return lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
              lastTicket.status === _const.ORDER_LINE_STATUS.FinalCheck
          } else
            return false;

        } catch (err) {
          return false;
        }

      });

      if (!foundOrderLine)
        throw error.orderLineNotFound;

      if (!isReturn) {

        if (isCC || (!isCC && isExternal)) {
          await this.makeInvoice(order, foundOrderLine, user);
        } else if (!isCC && !isExternal) {

          let to;
          if (user.warehouse_id === hub._id.toString()) {
            if (!order.is_collect)
              throw new Error('internal delivery from hub is allowed only for cc orders')
            to = {
              warehouse_id: mongoose.Types.ObjectId(order.address.warehouse_id)
            };

          } else {
            to = {
              warehouse_id: mongoose.Types.ObjectId(hub._id)
            };
          }

          let foundDelivery = await new DeliveryModel(this.test).initiate(order, foundOrderLine,
            {warehouse_id: mongoose.Types.ObjectId(user.warehouse_id)},
            to,
            user.warehouse_id, true);

          if (!foundDelivery.delivery_agent)
            throw new Error('founded delivery has no agent')

          await super.setOrderLineAsReadyToDeliver(order, foundOrderLine, user.id, foundDelivery.delivery_agent)
        }
      } else {
        if (user.warehouse_id !== hub._id.toString())
          throw error.noAccess;

        const centralWarehouseId = (await new WarehouseModel(this.test).getAll()).find(x => !x.has_customer_pickup && !x.is_hub)._id;
        let foundDelivery = await new DeliveryModel(this.test).initiate(order, foundOrderLine,
          {warehouse_id: user.warehouse_id},
          {warehouse_id: centralWarehouseId},
          user.warehouse_id, true);

        if (!foundDelivery.delivery_agent)
          throw new Error('founded delivery has no agent')

        await super.setOrderLineAsReadyToDeliver(order, foundOrderLine, user.id, foundDelivery.delivery_agent)

      }

      if (!this.test)
        socket.sendToNS(user.warehouse_id)
    } catch (err) {
      console.log('-> after final check', err);
      throw err;
    }
  }

  async makeInvoice(order, orderLine, user) {
    try {
      order = (await super.setOrderLineAsChecked(order, orderLine, user.id, user.warehouse_id)).order;
      let isAggregated = await this.checkOrderAggregation(order, user.warehouse_id, [_const.ORDER_LINE_STATUS.Checked]);
      if (isAggregated) {
        await super.setOrderAsWaitForInvoice(order, user.id, user.warehouse_id);
        let Offline = require('./offline.model');
        return new Offline(this.test).requestInvoice(order, user)
      }

    } catch (err) {
      console.log('-> error on making invoice', err);
      throw err;
    }
  }

  async afterDeliveryStarted(delivery, user, preCheck = false, isExternal = false, isExternalRetrun = false) {
    try {

      let receiverId;

      if (!isExternal || (isExternal && isExternalRetrun))
        receiverId = user.id;
      else
        receiverId = delivery.from.warehouse_id;

      let centralWarehouse = (await new WarehouseModel(this.test).getWarehouses()).find(x => !x.is_hub && !x.has_customer_pickup);
      let isInternalReturn = !isExternal && delivery.to.warehouse_id.toString() === centralWarehouse._id.toString();

      /**
       * in case of external return scanned item would be all return requested order lines of orders
       * which are Ready to deliver after package requested by delivey agent
       */
      let scannedItems = await super.getDeliveryAgentOrderLines(receiverId, isExternal, isExternalRetrun, isInternalReturn);

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
          excludeItems.push(x) // in case of external delivery there should be no exclude item
      });

      if (preCheck)
        return Promise.resolve(matchedItems);


      const OrderModel = require('./order.model');


      let setorderLinesOndeliver = async (items) => {
        for (let i = 0; i < items.length; i++) {

          let o = await new OrderModel(this.test).getById(items[i]._id);
          if (!o)
            throw error.orderNotFound;

          let ol = o.order_lines.find(x => x._id.toString() === items[i].order_line_id.toString());
          if (!ol)
            throw error.orderLineNotFound;

          await super.setOrderLineAsOnDelivery(o, ol, user.id, user.id);
        }

      }

      if (!isExternal) {

        if (excludeItems)
          await new DeliveryModel(this.test).syncDeliveryItems(delivery, excludeItems);

        await setorderLinesOndeliver(matchedItems);

        for (let i = 0; i < excludeItems.length; i++) {
          let foundOrder = await new OrderModel(this.test).getById(excludeItems[i]._id);
          if (!foundOrder)
            throw error.orderNotFound;

          let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === excludeItems[i].order_line_id.toString());
          if (!foundOrderLine)
            throw error.orderLineNotFound;


          let hub = await new WarehouseModel(this.test).getHub();
          if (!hub)
            throw error.WarehouseNotFound;


          if (delivery.from.warehouse_id.toString() !== hub._id.toString()) {
            await super.setOrderLineAsVerfiedByOnlineWarhouse(foundOrder, foundOrderLine, user.id, delivery.from.warehouse_id);
          } else {
            await super.setOrderLineAsDelivered(foundOrder, foundOrderLine, user.id, hub._id);
          }
        }
      } else if (isExternal && !isExternalRetrun) {
        if (excludeItems && excludeItems.length)
          throw new Error('some order lines of order are not still in delivery');

        let orders = [];

        for (let i = 0; i < delivery.order_details.length; i++) {
          let foundOrder = await new OrderModel(this.test).getById(delivery.order_details[i].order_id);
          if (!foundOrder)
            error.orderNotFound;

          if (foundOrder.tickets[foundOrder.tickets.length - 1].status !== _const.ORDER_STATUS.ReadyToDeliver) // orders must be ready to deliver (after invoice)
            throw new Error('delivery contains order which id not ready to deliver yet');

          let isAggregated = await this.checkOrderAggregation(foundOrder, delivery.from.warehouse_id, [_const.ORDER_LINE_STATUS.Checked]); // all order lines must be checked
          if (!isAggregated)
            throw new Error('delivery contains not aggregated orders');

          orders.push(foundOrder)
        }


        for (let i = 0; i < orders.length; i++)
          await super.setOrderAsOnDelivery(orders[i], user.id);
      }
      else if (isExternal && isExternalRetrun) {
        await setorderLinesOndeliver(matchedItems);
      }

      if (!isExternal || (isExternal && !isExternalRetrun) && !this.test)
        socket.sendToNS(delivery.from.warehouse_id)

    } catch (err) {
      console.log('-> error on after delivery started', err);
      throw err;
    }
  }

  async afterDeliveryEnded(delivery, user, isExternal, isExternalRetrun) {
    try {

      if (!isExternal || isExternalRetrun) {
        for (let i = 0; i < delivery.order_details.length; i++) {
          let order = {_id: delivery.order_details[i].order_id};
          for (let j = 0; j < delivery.order_details[i].order_line_ids.length; j++) {
            let orderLine = {_id: delivery.order_details[i].order_line_ids[j]};
            await super.setOrderLineAsDelivered(order, orderLine, user.id, delivery.to.warehouse_id)
          }
        }
      } else {
        for (let i = 0; i < delivery.order_details.length; i++) {
          let order = {_id: delivery.order_details[i].order_id};
          await super.setOrderAsDelivered(order, user.id);
        }
      }

      if (!this.test && !isExternal)
        socket.sendToNS(delivery.to.warehouse_id);

    } catch (err) {
      console.log('-> error on after delivey ended ', err);
      throw err;
    }
  }


  async afterInternalReceive(order, orderLine, user) {
    try {

      let hub = await new WarehouseModel(this.test).getHub()
      if (!hub)
        throw errors.WarehouseNotFound;

      let destination;

      if (!order.is_collect) {
        if (user.warehouse_id !== hub._id.toString())
          throw errors.noAccess;

      } else { // is collect
        destination = (await new WarehouseModel(this.test).getShops()).find(x => x._id.toString() === order.address.warehouse_id.toString());
        if (!destination)
          throw error.WarehouseNotFound;

        if (![hub, destination].map(x => x._id.toString()).includes(user.warehouse_id))
          throw errors.noAccess;
      }

      if (hub._id.toString() === user.warehouse_id) { // in hub

        let to;
        if (order.is_collect) {
          to = {
            warehouse_id: destination._id
          }
        } else {
          to = {
            customer: {
              _id: order.customer_id,
              address: order.address
            }
          }
        }

        let foundDelivery = await new DeliveryModel(this.test).initiate(order, orderLine,
          {warehouse_id: hub._id}, to, user.warehouse_id);

        if (!foundDelivery)
          throw error.deliveryNotFound;

        if (!order.is_collect) {
          let isAggregated = await this.checkOrderAggregation(order, user.warehouse_id);
          if (isAggregated)
            await super.setOrderAsDeliverySet(order, user.id, user.warehouse_id);

        } else {

          await super.setOrderLineAsDeliverySet(order, orderLine, user.id, user.warehouse_id);
          let lastTicket = this.getLastTicket(foundDelivery);
          if (lastTicket.status === _const.DELIVERY_STATUS.requestPackage)
            await super.setOrderLineAsFinalCheck(order, orderLine, user.id, user.warehouse_id);

        }
        if (!this.test)
          socket.sendToNS(user.warehouse_id);
        return new DeliveryModel(this.test).makeDeliveryShelfCode(foundDelivery._id)

      } else if (user.warehouse_id === destination._id.toString()) {

        let isAggregated = await this.checkOrderAggregation(order, user.warehouse_id, [
          _const.ORDER_LINE_STATUS.ReadyToDeliver,
          _const.ORDER_LINE_STATUS.Recieved
        ]);

        if (isAggregated) {
          for (let i = 0; i < order.order_lines.length; i++) {
            if (!order.order_lines[i].cancel)
              await super.setOrderLineAsFinalCheck(order, order.order_lines[i], user.id, user.warehouse_id)
          }
        }
      }

      if (!this.test)
        socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> error on after receive', err);
      throw err;
    }
  }

  async afterInvoiceVerification(orderId, invoiceNo, userId, warehouseId, points) {

    try {

      let warehouses = await new WarehouseModel(this.test).getAll()

      let hub = warehouses.find(x => x.is_hub);


      let foundOrder = await this.OrderModel.findOne({
        $and: [
          {_id: mongoose.Types.ObjectId(orderId)},
          {
            $or: [
              {invoice_number: {$exists: false}},
              {invoice_number: {$eq: null}}

            ]
          }
        ]
      })
      if (!foundOrder)
        throw error.orderNotFound;

      if (warehouseId.toString() === hub._id.toString() && foundOrder.is_collect)
        throw error.noAccess;


      const lastTicket = this.getLastTicket(foundOrder);
      if (lastTicket.status !== _const.ORDER_STATUS.WaitForInvoice && lastTicket.status !== _const.ORDER_STATUS.InvoiceVerified)
        throw error.noAccess;

      if (lastTicket.status === _const.ORDER_STATUS.InvoiceVerified)
        return Promise.resolve('invoice verification has been done before')

      let isAggregated = await this.checkOrderAggregation(foundOrder, warehouseId);

      if (!isAggregated)
        throw new Error('cannot set invoice number for not aggregated order');

      let CustomerModel = require('./customer.model');
      await new CustomerModel(this.test).updateByOfflineSystem(foundOrder.customer_id, points)

      await this.OrderModel.findOneAndUpdate({
        _id: foundOrder._id
      }, {
          invoice_number: invoiceNo
        });

      await super.setOrderAsInvoiceVerified(foundOrder, userId, warehouseId);

      if (foundOrder.is_collect && foundOrder.address.warehouse_id.toString() === warehouseId) {
        await super.setOrderAsDelivered(foundOrder, userId);
      } else {
        await super.setOrderAsReadyToDeliver(foundOrder, userId, warehouseId);
      }

      if (!this.test)
        socket.sendToNS(warehouseId);

    } catch (err) {
      console.log('-> ', 'error after invoice verification');
      throw err;
    }

  }


  async afterNotExists(order, orderLine) {
    try {
      let SMMessage = require('./sm_message.model');

      let extra = {
        customer_id: order.customer_id,
        hasMoreOrderLines: order.order_lines.length !== 1
      };
      await new SMMessage(this.test).pubishMessage(order._id, orderLine._id, _const.SM_MESSAGE.NotExists, extra);

    } catch (err) {
      console.log('-> error on after not exists: ', err);
      throw err;
    }
  }

  async afterRequestReturn(order, orderLines, addressId, user) {
    try {

      let SMMessage = require('./sm_message.model');
      let smMessage = new SMMessage(this.test);

      let AgentModel = require('./agent.model');
      let salesManager = await new AgentModel(this.test).getSalesManager();

      for (let i = 0; i < orderLines.length; i++) {
        await super.setOrderLineAsReturnRequested(order, orderLines[i], user.id, salesManager._id);
        await smMessage.pubishMessage(
          order._id,
          orderLines[i]._id,
          _const.SM_MESSAGE.ReturnRequest,
          {
            address_id: addressId
          });
      }

    } catch (err) {
      console.log('-> error on after return request ', err);
      throw err;
    }
  }


  async afterDamageInformed(order, orderLine, user) {
    try {

      let AgentModel = require('./agent.model');
      let SMMessage = require('./sm_message.model');

      let salesManager = await new AgentModel(this.test).getSalesManager()
      if (!salesManager)
        throw error.salesManagerNotFound;

      await super.setOrderLineAsDamaged(order, orderLine, user.id, salesManager._id);
      await new SMMessage(this.test).pubishMessage(order._id, orderLine._id, _const.SM_MESSAGE.Damage);

      if (!this.test)
        socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> erro on after damage informed', err);
      throw err;
    }
  }


  async afterLost(order, orderLine, user) {
    try {
      let ProductModel = require('./product.model');
      let foundInstance = await new ProductModel(this.test).getInstance(orderLine.product_id, orderLine.product_instance_id);
      if (!foundInstance)
        throw error.productInstanceNotExist;

      if (!orderLine.tickets.find(x => x.status === _const.ORDER_LINE_STATUS.WaitForLostWarehouse)) {
        let SMMessage = require('./sm_message.model');
        await new SMMessage(this.test).pubishMessage(order._id, orderLine._id, _const.SM_MESSAGE.Lost, {
          warehouseId: user.warehouse_id
        });
      }

      await new Offline(this.test).requestLostWarehouse(order._id, orderLine._id, foundInstance.barcode, user);
      await super.setOrderLineAsWatingForLostWarehouse(order, orderLine, user.id, user.warehouse_id);

      if (!this.test)
        socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> ', 'after mismatch error');
      throw err;
    }
  }

  async afterLostVerification(orderId, orderLineId, userId, warehouseId) {
    try {

      let foundOrder = await this.OrderModel.findOne({
        _id: mongoose.Types.ObjectId(orderId)
      }).lean();

      if (!foundOrder)
        throw error.orderNotFound;

      let foundOrderLine = foundOrder.order_lines.find(x => x._id.toString() === orderLineId);
      if (!foundOrderLine)
        throw error.orderLineNotFound;


      let WarehouseModel = require('./warehouse.model');
      let warehouses = await new WarehouseModel(this.test).getWarehouses();

      await this.syncLostInventory(orderLine, warehouses, warehouseId);

      let DeliveryModel = require('./delivery.model');
      await new DeliveryModel(this.test).safeRemoveOrderLineFromDelivery(foundOrderLine._id);

      return this.renewLostOrderLine(foundOrder, foundOrderLine, warehouses);

    } catch (err) {
      console.log('-> error on after lost warehouse verification', err);
      throw err;
    }
  }

  async syncLostInventory(orderLine, warehouses, warehouseId) {
    try {

      if (warehouses.find(x => x._id.toString() === warehouseId.toString())) { // lost is not reported in hub
        if (!orderLine.tickets.find(x => x.status === _const.ORDER_LINE_STATUS.OnlineWarehouseVerified)) {
          let ProductModel = require('./product.model');
          await new ProductModel(this.test).setInventory(orderLine.product_id, orderLine.product_instance_id, warehouseId, null, -1, -1, null);
        }
      }
      return Promise.resolve();
    } catch (err) {
      console.log('-> error on sync order line inventory', err);
      throw err;
    }
  }

  async renewLostOrderLine(order, orderLine, warehouses) {
    try {
      let isReturn = orderLine.tickets.map(x => x.status).includes(_const.ORDER_LINE_STATUS.ReturnRequested);
      if (!orderLine.cancel && !isReturn) {
        await this.ORP(order, orderLine, warehouses, null, true);
      } else
        return Promise.resolve();
    } catch (err) {
      console.log('-> errro on renew lost order line', err);
      throw err;
    }
  }

  async requestLostWarehouse(order, orderLine, user) {
    try {

    } catch (err) {
      console.log('-> error on request lost warehouse');
      throw err;
    }
  }


  async checkOrderAggregation(order, warehouseId, statuses = null) {

    try {

      const checkAll = (targetId) => {

        if (order.order_lines.length === 1)
          return Promise.resolve(true);

        return Promise.resolve(order.order_lines.every(ol => {

          try {

            if (ol.cancel)
              return true;

            const lastTicket = this.getLastTicket(ol);

            let conidtion = lastTicket.receiver_id.toString() === targetId.toString();
            if (statuses && statuses.length)
              conidtion = conidtion && statuses.includes(lastTicket.status);

            return conidtion;
          } catch (error) {

            return false;
          }

        }));
      }

      const checkAllExceptInDist = () => {
        return Promise.resolve(order.order_lines.every(ol => {
          try {

            if (ol.cancel)
              return true;

            const lastTicket = this.getLastTicket(ol);

            // all order lines are whether in hub or in destination

            let conidtion = lastTicket.receiver_id.toString() === hub._id.toString() ||
              lastTicket.receiver_id.toString() === destination._id.toString();

            if (statuses && statuses.length)
              conidtion = conidtion && statuses.includes(lastTicket.status);

            return conidtion;
          } catch (error) {
            return false;
          }

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
          return checkAll(destination._id);
        } else if (is_hub) { // is in hub
          return checkAllExceptInDist();
        }

      } else { // not C&C
        if (is_hub) { // is in hub
          return checkAll(hub._id);
        }
      }


    } catch (err) {
      console.log('-> error on check aggregation');
      throw err;
    }

  }

}


module.exports = DSS;

