const error = require('./errors.list');
const mongoose = require('mongoose');
const WarehouseModel = require('./warehouse.model');
const ProductModel = require('./product.model');
const CustomerModel = require('./customer.model');
const TicketModel = require('./ticket.model');
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
    return new WarehouseModel(Order.test).getAllWarehouses()
      .then(warehouses => {
        if (!order)
          return Promise.reject(error.orderNotFound);

        if (!order.address)
          return Promise.reject(error.addressIsRequired);

        let promises = [];

        if (!res.is_collect) {
          res.order_lines.forEach(x => {
            promises.push(() => this.ORP(order, x, warehouses))
          });
        }
        else {
          res.order_lines.forEach(x => {
            promises.push(() => this.processCC(order, x, warehouses))
          });
        }
        return promises.reduce((x, y) => x.then(y), Promise.resolve());
      });


  }


  processCC(order, order_line, warehouses) {
    let CCWarehouse = warehouses.find(x => x.address._id.toString() === order.address._id.toString());

    return new ProductModel(Order.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);

        let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === CCWarehouse._id.toString() && (x.count - x.reserved > 0));
        if (foundInventory) {

          return this.UIandSVPT(order, order_line, warehouse, _const.ORDER_STATUS.default);
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

    return new ProductModel(Order.test).getInstance(order_line.product_id.toString(), order_line.product_instance_id.toString())
      .then(productInstance => {

        if (!productInstance)
          return Promise.reject(error.productInstanceNotExist);

        let warehouse;

        for (let i = 0; i < filteredWarehouses.length; i++) {
          let foundInventory = productInstance.inventory.find(x => x.warehouse_id.toString() === filteredWarehouses[i]._id.toString() && (x.count - x.reserved > 0));
          if (foundInventory) {
            warehouse = filteredWarehouses[i];
            break;
          }
        }

        let status = _const.ORDER_STATUS.default;
        if (!warehouse) {
          status = _const.ORDER_STATUS.NotExists;
          warehouse = filteredWarehouses.find(x => x.is_center);
        }
        return this.UIandSVPT(order, order_line, warehouse, status);
      });
  }


  setNotExistsTicket(order, order_line){


    return new AgentModel(DSS.test).getSalesManager()
    .then(res =>{
      if(!res)
      return Promise.reject(error.salesManagerNotFound)

    })
    

    new TicketModel(Order.test).setTicket(order._id, order_line._id, status, warehouse._id, null)
    
  }

  /**
   * UIandSPT ==> update inventory and set verifed payment ticket 
   */
  UIandSVPT(order, order_line, warehouse, status) {

    return new ProductModel(Order.test).setInventory({
      id: order_line.product_id,
      productInstanceId: order_line.product_instance_id,
      warehouseId: warehouse._id,
      delReserved: 1
    })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          new TicketModel(Order.test).setTicket(order._id, order_line._id, status, warehouse._id, null)
        }
        else {
          return Promise.reject(error.invalidInventoryCount);
        }
      })
      .then(res => {
        return socket.sendToNS(warehouse._id.toString(), {
          type: status,
          data: {
          }
        });
      });

  }


  /**
  * UIandSOWVT ==> update inventory and set verified online warehouse ticket 
  */
  UIandSVOWT(order, order_line, userId, warehouseId) {

    return new ProductModel(this.test).setInventory({
      id: order_line.product_id.toString(),
      productInstanceId: order_line.product_instance_id.toString(),
      warehouseId: warehouseId,
      delCount: -1,
      delReserved: -1
    })
      .then(res => {
        if (res && res.n === 1 && res.nModified === 1) {
          return this.setTicket(order._id, order_line._id, _const.ORDER_STATUS.OnlineWarehouseVerified, userId, warehouseId)
        }
        else {
          return Promise.reject(error.invalidInventoryCount);
        }
      })
      .then(res => {
        return socket.sendToNS(warehouse._id.toString(), {
          type: status,
          data: {
          }
        });
      });

  }




}

module.exports = DSS;

