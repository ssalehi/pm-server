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

      let foundOrderLine = order.order_lines.find(x => {

        if (x.product_instance_id.toString() === product.instance._id.toString()) {
          const lastTicket = x.tickets && x.tickets.length ? x.tickets[x.tickets.length - 1] : null;
          return lastTicket && !lastTicket.is_processed && lastTicket.receiver_id.toString() === user.warehouse_id.toString() &&
            [
              _const.ORDER_LINE_STATUS.default,
              _const.ORDER_LINE_STATUS.CancelRequested,
              _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
              _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
              _const.ORDER_LINE_STATUS.Renew,
              _const.ORDER_LINE_STATUS.Delivered,
              _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
              _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled,
            ].includes(lastTicket.status);
        } else
          return false;
      })
      if (!foundOrderLine)
        throw error.orderLineNotFound;

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;

      if (!lastTicket || lastTicket.is_processed)
        throw error.activeTicketNotFound;

      let Offline = require('./offline.model');
      let warehouseModel = new WarehouseModel(this.test);
      let hub = await warehouseModel.getHub();

      let returnToCentral = async (o, ol) => {
        const centralWarehouseId = (await warehouseModel.getAll()).find(x => !x.has_customer_pickup && !x.is_hub)._id;
        let foundDelivery = await deliveryModel.initiate(o, ol,
          {
            warehouse_id: hub._id
          },
          {
            warehouse_id: centralWarehouseId
          }, hub._id)
        if (!foundDelivery)
          throw error.deliveryNotFound;

        await super.setOrderLineAsDeliverySet(o, ol, user.id, hub._id);
        if (foundDelivery.tickets[foundDelivery.tickets.length - 1].status === _const.DELIVERY_STATUS.requestPackage)
          await super.setOrderLineAsFinalCheck(o, ol, user.id, hub._id);

      }

      if ([
        _const.ORDER_LINE_STATUS.default,
        _const.ORDER_LINE_STATUS.CancelRequested,
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
        _const.ORDER_LINE_STATUS.Renew,
      ].includes(lastTicket.status)) { // scan is for newly paid, renewed or canceled order line

        const deliveryModel = new DeliveryModel(this.test);

        /**
         * first  remove order line from active delivery if exists
         */
        if (lastTicket.status === _const.ORDER_LINE_STATUS.CancelRequested) {
          let foundDelivery = await deliveryModel.getActiveDeliveryByOrderLineId(foundOrderLine._id);
          if (foundDelivery) {
            await deliveryModel.removeOrderLineFromDelivery(foundDelivery, foundOrderLine._id);
          }
        }

        if (!hub)
          throw error.WarehouseNotFound;

        if (user.warehouse_id === hub._id.toString()) { // order line must be returned to central warehouse

          if (!order.customer_id)
            throw new Error('guest orders cannot be returned');

          let OrderModel = require('./order.model');
          let addedBalance = await new OrderModel(this.test).calculateReturnPrice(order, foundOrderLine);

          let CustomerModel = require('./customer.model');
          await new CustomerModel(this.test).changeBalance(order.customer_id, addedBalance);
          
          await returnToCentral(order, foundOrderLine);
        }
        else { // order line must be added to current warehouses
          let reverse = lastTicket.status === _const.ORDER_LINE_STATUS.CancelRequested;

          await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), foundOrderLine._id.toString(), foundOrderLine.product_instance_id.toString(), user, reverse)
          if (!reverse)
            await super.setOrderLineAsWatingForOnlineWarehouse(order, foundOrderLine, user.id, user.warehouse_id);
          else
            await super.setOrderLineAsWatingForOnlineWarehouseCancel(order, foundOrderLine, user.id, user.warehouse_id);
        }
      }
      else if (lastTicket.status === _const.ORDER_LINE_STATUS.Delivered) { // scan is for received order line

        let res = await super.setOrderLineAsReceived(order, foundOrderLine, user.id, user.warehouse_id);
        order = res.order;
        foundOrderLine = res.orderLine;


        if (foundOrderLine.tickets.map(x => x.status).includes(_const.ORDER_LINE_STATUS.CancelRequested) ||
          foundOrderLine.tickets.map(x => x.status).includes(_const.ORDER_LINE_STATUS.ReturnRequested)) {
          if (user.warehouse_id !== hub._id.toString()) // scan in central warehouse
            return this.afterInternalReturnReceive(order, foundOrderLine, user);
          else // scan in hub
            await returnToCentral(order, foundOrderLine);

        }
        else
          return this.afterInternalReceive(order, foundOrderLine, user)

      } else if (lastTicket.status === _const.ORDER_LINE_STATUS.OnlineWarehouseVerified) {
        return this.afterSoldOut(order, foundOrderLine, user.id, user.warehouse_id)

      } else if (lastTicket.status === _const.ORDER_LINE_STATUS.OnlineWarehouseCanceled) {
        // return this.afterSoldOut(order, foundOrderLine, user.id, user.warehouse_id)
      }

      if (!this.test)
        socket.sendToNS(user.warehouse_id);

    } catch (err) {
      console.log('-> error on after scan', err);
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

      const lastTicket = foundOrderLine.tickets && foundOrderLine.tickets.length ? foundOrderLine.tickets[foundOrderLine.tickets.length - 1] : null;
      if (!lastTicket ||
        lastTicket.is_processed ||
        ![
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

      let data = {
        id: foundOrderLine.product_id.toString(),
        productInstanceId: foundOrderLine.product_instance_id.toString(),
        warehouseId
      }

      if (!reverse) {
        data.delReserved = -1;
        data.delCount = -1;
      } else {
        data.delCount = 1;
      }

      await new ProductModel(this.test).setInventory(data);

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

      if (!order.is_collect || (order.is_collect && order.address.warehouse_id.toString() !== warehouseId.toString())) {
        let hub = await new WarehouseModel(this.test).getHub();
        let delivery = await new DeliveryModel(this.test).initiate(order, orderLine,
          {warehouse_id: mongoose.Types.ObjectId(warehouseId)},
          {warehouse_id: hub._id},
          warehouseId);

        if (!delivery)
          throw error.deliveryNotFound;
        await super.setOrderLineAsDeliverySet(order, orderLine, userId, warehouseId);
        if (delivery.tickets[delivery.tickets.length - 1].status === _const.DELIVERY_STATUS.requestPackage) {
          await super.setOrderLineAsFinalCheck(order, orderLine, userId, warehouseId);
        }
      }
      else {

        /**
         * change ticket from online warehouse verified to ready to deliver
         * if it remains online warehouse verified, it will remain in inbox and prevent scanning 
         *   */
        let res = await super.setOrderLineAsReadyToDeliver(order, orderLine, userId, warehouseId);
        order = res.order;

        let isAggregated = await this.checkOrderAggregation(order, warehouseId, [
          _const.ORDER_LINE_STATUS.Recieved,
          _const.ORDER_LINE_STATUS.ReadyToDeliver,
        ]);
        if (isAggregated) {
          for (let i = 0; i < order.order_lines.length; i++) {
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

  async afterFinalCheck(order, product, user, isExternal = false, isCC = false, isReturn = false) {
    try {
      if (!order)
        throw error.orderNotFound;

      let foundOrderLine = order.order_lines.find(x => {

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

      let hub = await new WarehouseModel(this.test).getHub();
      if (!hub)
        throw error.WarehouseNotFound;


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

      /**
       * in case of external return scanned item would be all return requested order lines of orders
       * which are Ready to deliver after package requested by delivey agent
       */
      let scannedItems = await super.getDeliveryAgentOrderLines(receiverId, isExternal, isExternalRetrun);

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


      if (orderLine.cancel) {
        await super.setOrderLineAsCancelRequested(order, orderLine, user.id, user.warehouse_id)
        if (!this.test)
          socket.sendToNS(user.warehouse_id);

      }

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

        } else
          await super.setOrderLineAsDeliverySet(order, orderLine, user.id, user.warehouse_id);

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

  async afterInternalReturnReceive(order, orderLine, user) {
    try {

      let central = (await new WarehouseModel(this.test).getAll()).find(x => !x.has_customer_pickup);

      if (!central)
        throw errors.WarehouseNotFound;

      const Offline = require('./offline.model');
      await new Offline(this.test).requestOnlineWarehouse(order._id.toString(), orderLine._id.toString(), orderLine.product_instance_id.toString(), user, true)
      await super.setOrderLineAsWatingForOnlineWarehouseCancel(order, orderLine, user.id, user.warehouse_id);

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


      const lastTicket = foundOrder.tickets && foundOrder.tickets.length ? foundOrder.tickets[foundOrder.tickets.length - 1] : null;
      if (!lastTicket || lastTicket.is_processed ||
        (lastTicket.status !== _const.ORDER_STATUS.WaitForInvoice && lastTicket.status !== _const.ORDER_STATUS.InvoiceVerified))
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


  async afterNotExists(order, orderLine, sm) {
    try {

    } catch (err) {
      console.log('-> error on after not exists: ', err);
      throw err;
    }
  }

  async afterRequestCancel(order, orderLine, user) {
    try {
      const lastTicket = orderLine.tickets[orderLine.tickets.length - 1];
      if ([
        _const.ORDER_LINE_STATUS.default,
        _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
        _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
        _const.ORDER_LINE_STATUS.ReadyToDeliver,
        _const.ORDER_LINE_STATUS.DeliverySet,
        _const.ORDER_LINE_STATUS.Delivered,
        _const.ORDER_LINE_STATUS.Recieved,
        _const.ORDER_LINE_STATUS.FinalCheck,
        _const.ORDER_LINE_STATUS.Renew,
      ].includes(lastTicket.status)) {
        await super.setOrderLineAsCancelRequested(order, orderLine, user.id, lastTicket.receiver_id) // set ticket for where order line is currently in
        if (!this.test)
          socket.sendToNS(lastTicket.receiver_id);
      }
    } catch (err) {
      console.log('-> error on after cancel request', err);
      throw err;
    }
  }

  async afterRequestReturn(order, orderLines, addressId, user) {
    try {
      let AgentModel = require('./agent.model');
      let salesManager = await new AgentModel(this.test).getSalesManager()
      if (!salesManager)
        throw error.salesManagerNotFound;

      let SMMessage = require('./sm_message.model');
      let smMessage = new SMMessage(this.test);
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

      if (!this.test)
        socket.sendToNS(salesManager._id)

    } catch (err) {
      console.log('-> error on after return request ', err);
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


  async checkOrderAggregation(order, warehouseId, statuses = null) {

    try {

      const checkAll = (targetId) => {

        if (order.order_lines.length === 1)
          return Promise.resolve(true);

        return Promise.resolve(order.order_lines.every(ol => {

          if (ol.tickets.map(x => x.status).includes(_const.ORDER_LINE_STATUS.CancelRequested))
            return true;

          const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

          if (!lastTicket || lastTicket.is_processed)
            return false;

          let conidtion = lastTicket.receiver_id.toString() === targetId.toString();
          if (statuses && statuses.length)
            conidtion = conidtion && statuses.includes(lastTicket.status);

          return conidtion;
        }));
      }

      const checkAllExceptInDist = () => {
        return Promise.resolve(order.order_lines.every(ol => {
          if (ol.tickets.map(x => x.status).includes(_const.ORDER_LINE_STATUS.CancelRequested))
            return true;

          const lastTicket = ol.tickets && ol.tickets.length ? ol.tickets[ol.tickets.length - 1] : null;

          if (!lastTicket || lastTicket.is_processed)
            return false;

          // all order lines are whether in hub or in destination

          let conidtion = lastTicket.receiver_id.toString() === hub._id.toString() ||
            lastTicket.receiver_id.toString() === destination._id.toString();

          if (statuses && statuses.length)
            conidtion = conidtion && statuses.includes(lastTicket.status);

          return conidtion;
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

