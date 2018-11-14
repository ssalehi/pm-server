const Base = require('./base.model');


let warehouses = [];


class Warehouse extends Base {

  constructor(test = Warehouse.test) {

    super('Warehouse', test);

    this.WarehouseModel = this.model;
    if (test)
      warehouses = [];
  }

  async getHub() {
    if (warehouses && warehouses.length)
      return Promise.resolve(warehouses.find(x => x.is_hub));
    else
      return this.WarehouseModel.find({
        is_hub: true,
      });
  }

  async getAll() {
    if (!warehouses || !warehouses.length)
      warehouses = await this.WarehouseModel.find().sort({priority: 1}).lean();
    return Promise.resolve(warehouses);
  }

  getWarehouses() {
    if (warehouses && warehouses.length)
      return Promise.resolve(warehouses.filter(x => !x.is_hub));
    else
      return this.WarehouseModel.find({
        is_hub: false,
      }).sort({priority: 1}).lean();
  }

  getShops() {
    if (warehouses && warehouses.length)
      return Promise.resolve(warehouses.filter(x => x.has_customer_pickup));
    else
      return this.WarehouseModel.find({
        has_customer_pickup: true,
      }).sort({priority: 1}).lean();
  }
}

Warehouse.test = false;

module.exports = Warehouse;