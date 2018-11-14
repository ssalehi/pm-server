const Base = require('./base.model');
const mongoose = require('mongoose');

class Warehouse extends Base {

  constructor(test = Warehouse.test) {

    super('Warehouse', test);

    this.WarehouseModel = this.model;
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
    if (!warehouses || warehouses.length)
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



  updateWarehouses(body) {
    console.log(body)
    var promises1 = [];
    body.warehouses.forEach(element => {
      promises1.push(
        this.WarehouseModel.findOneAndUpdate({
          _id: element._id,
        }, {
          $set: {
            'priority': -10 * element.priority - 1
          }
        }));
    });

    return Promise.all(promises1).then(() => {
      var promises = [];
      body.warehouses.forEach(element => {
        promises.push(
          this.WarehouseModel.findOneAndUpdate({
            _id: element._id,
          }, {
            $set: {
              'priority': element.priority,
              'is_active': element.is_active
            }
          }, {
            new: true
          }));
      });
      return Promise.all(promises);
    })
  }
}

Warehouse.test = false;

module.exports = Warehouse;