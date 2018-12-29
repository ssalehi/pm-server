const Base = require('./base.model');
const mongoose = require('mongoose');


let warehousedata = [];


class Warehouse extends Base {

  constructor(test = Warehouse.test) {

    super('Warehouse', test);

    this.WarehouseModel = this.model;
    if (test)
      warehousedata = [];
  }

  async getHub() {
    if (warehousedata && warehousedata.length)
      return Promise.resolve(warehousedata.find(x => x.is_hub));
    else
      return this.WarehouseModel.findOne({
        is_hub: true,
      }).lean();
  }

  async getAll() {
    if (!warehousedata || !warehousedata.length)
      warehousedata = await this.WarehouseModel.find().sort({
        priority: 1
      }).lean();

    return Promise.resolve(warehousedata);
  }

  getWarehouses() {
    if (warehousedata && warehousedata.length)
      return Promise.resolve(warehousedata.filter(x => !x.is_hub));
    else
      return this.WarehouseModel.find({
        is_hub: false,
      }).sort({
        priority: 1
      }).lean();
  }



  getShops() {
    if (warehousedata && warehousedata.length)
      return Promise.resolve(warehousedata.filter(x => x.has_customer_pickup));
    else
      return this.WarehouseModel.find({
        has_customer_pickup: true,
      }).sort({
        priority: 1
      }).lean();
  }



  async updateWarehouses(body) {
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
    }).then(async () => {
      warehousedata = await this.WarehouseModel.find().sort({
        priority: 1
      }).lean();

      return Promise.resolve();
    })
  }
}

Warehouse.test = false;

module.exports = Warehouse;