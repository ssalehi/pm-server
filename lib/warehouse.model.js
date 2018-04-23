const Base = require('./base.model');

class Warehouse extends Base {

  constructor(test = Warehouse.test) {

    super('Warehouse', test);

    this.WarehouseModel = this.model;
  }

  getAllWarehouses() {
    return this.WarehouseModel.find().sort({priority: 1}).lean();
  }

  getWarehouses() {
    return this.WarehouseModel.find({
      has_customer_pickup: true,
    }).sort({priority: 1}).lean();
  }
}

Warehouse.test = false;

module.exports = Warehouse;