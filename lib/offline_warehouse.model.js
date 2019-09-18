const Base = require('./base.model');


let warehousedata = [];


class OfflineWarehouse extends Base {

  constructor(test = OfflineWarehouse.test) {

    super('OfflineWarehouse', test);

    this.offlineWarehouseModel = this.model;
    if (test)
      warehousedata = [];
  }

  async getAll() {
    if (warehousedata && warehousedata.length)
      return Promise.resolve(warehousedata);
    else
      return this.offlineWarehouseModel.find({
      }).lean();
  }

  async getDamage() {
    try {

      let warehouses = await this.getAll();
      return warehouses.find(x => x.name === 'damage-lost')

    } catch (err) {
      console.log('-> error on get damage offline warehouse', err);
      throw err;
    }
  }
  async getOnline() {
    try {
      let warehouses = await this.getAll();
      return warehouses.find(x => x.name === 'online')

    } catch (err) {
      console.log('-> error on get online offline warehouse', err);
      throw err;
    }

  }

}

OfflineWarehouse.test = false;

module.exports = OfflineWarehouse;