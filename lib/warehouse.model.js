const Base = require('./base.model');

class Warehouse extends Base {

  constructor(test = Warehouse.test) {

    super('Warehouse', test);

    this.WarehouseModel = this.model;
  }

  getWarehouses() {
    return this.WarehouseModel.find();
  }
}

Warehouse.test = false;

module.exports = Warehouse;