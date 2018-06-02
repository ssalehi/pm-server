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

    return new ProductModel(this.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);

        let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === CCWarehouse._id.toString() && (x.count - x.reserved > 0));
        if (foundInventory) {

          return this.setAsReserved(order, order_line, CCWarehouse, _const.ORDER_STATUS.default);

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
          return this.setAsNotExists(order, order_line);
        }
        else {
          return this.setAsReserved(order, order_line, warehouse, _const.ORDER_STATUS.default);
        }

      });
  }

  setAsNotExists(order, order_line) {

    const TicketModel = require('./ticket.model');

    return new AgentModel(this.test).getSalesManager()
      .then(salesManager => {
        if (!salesManager) {
          return Promise.reject(error.salesManagerNotFound)
        }
        return new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_STATUS.NotExists, null, salesManager._id)
      })

  }

  setAsReserved(order, order_line, prefferedWarehouse, status) {

    const TicketModel = require('./ticket.model');

    return new ProductModel(this.test).setInventory({
      id: order_line.product_id,
      productInstanceId: order_line.product_instance_id,
      warehouseId: prefferedWarehouse._id,
      delReserved: 1
    })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          new TicketModel(this.test).setTicket(order, order_line, status, null, prefferedWarehouse._id)
        }
        else {
          return Promise.reject(error.invalidInventoryCount);
        }
      })
      .then(res => {
        socket.sendToNS(prefferedWarehouse._id)
      })
  }

  /**
   * set order line as sold out meaning that remove its reserved flag and minus its count by 1 from inventrory
   * @param {*} order 
   * @param {*} order_line 
   * @param {*} userId 
   * @param {*} warehouseId 
   */
  setAsSoldOut(order, order_line, userId, warehouseId) {
    const TicketModel = require('./ticket.model');

    return new ProductModel(this.test).setInventory({
      id: order_line.product_id.toString(),
      productInstanceId: order_line.product_instance_id.toString(),
      warehouseId: warehouseId,
      delCount: -1,
      delReserved: -1
    })

  }

  setAsInvoiceVerified(order, userId, warehouseId) {
    const TicketModel = require('./ticket.model');

    Promise.all(order.order_lines.map(ol => {
      return new TicketModel(this.test).setTicket(order, ol, _const.ORDER_STATUS.InvoiceVerified, userId, warehouseId);
    }))
      .then(res => {
        socket.sendToNS(warehouseId)
      });
  }

  nextTicketIndication(order, order_line, userId, warehouseId) {


    const TicketModel = require('./ticket.model');
    return new WarehouseModel(this.test).getAll()
      .then(warehouses => {

        if (order.is_collect) {
          const destination = warehouses.find(x => x.address._id.toString() === order.address._id.toString());
          if (!destination)
            return Promise.reject(error.orderDestinationNotFound);

          if (destination._id.toString() === warehouseId.toString()) {
            return new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_STATUS.WaitForAggregation, userId, warehouseId)
          } else {
            return new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_STATUS.ReadyForInternalDelivery, userId, warehouseId)
          }

        } else {
          const hub = warehouses.find(x => x.is_hub);
          if (hub._id.toString() === warehouseId.toString()) {
            return new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_STATUS.WaitForAggregation, userId, warehouseId)
          } else {
            return new TicketModel(this.test).setTicket(order, order_line, _const.ORDER_STATUS.ReadyForInternalDelivery, userId, warehouseId)
          }

        }


      })





  }

  afterOnlineWarehouseVerification(orderId, orderLineId, userId, warehouseId) {

    const OrderModel = require('./order.model');
    return new OrderModel(this.test).model.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(order => {
        if (!order)
          return Promise.reject(error.orderNotFound);

        let foundOrderLine = order.order_lines.find(x => x._id.toString() === orderLineId);

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        let foundActiveTicket = foundOrderLine.tickets.find(x => !x.is_processed)
        if (!foundActiveTicket || foundActiveTicket.status !== _const.ORDER_STATUS.WaitForOnlineWarehouse)
          return Promise.reject(error.noAccess);

        return this.setAsSoldOut(order, foundOrderLine, userId, warehouseId).then(res => {
          if (res && res.n === 1 && res.nModified === 1) {

            return this.nextTicketIndication(order, foundOrderLine, userId, warehouseId);
          }
          else {
            return Promise.reject(error.invalidInventoryCount);
          }
        })
          .then(res => {
            socket.sendToNS(warehouseId)
          })

      })

  }



  afterInvoiceVerification(orderId, userId, warehouseId) {

    const OrderModel = require('./order.model');

    return new OrderModel(this.test).model.findById(mongoose.Types.ObjectId(orderId)).lean()
      .then(order => {
        if (!order)
          return Promise.reject(error.orderNotFound);

        let foundOrderLine = order.order_lines.find(x => x._id.toString() === body.orderLineId);

        if (!foundOrderLine)
          return Promise.reject(error.orderLineNotFound);

        let foundActiveTicket = foundOrderLine.tickets.find(x => !x.is_processed)
        if (!foundActiveTicket || foundActiveTicket.status !== _const.ORDER_STATUS.WaitForOnlineWarehouse)
          return Promise.reject(error.noAccess);

        return this.setAsInvoiceVerified(order, userId, warehouseId)

      })

  }



}

module.exports = DSS;

