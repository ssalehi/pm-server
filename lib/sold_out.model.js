const Base = require('./base.model');
const mongoose = require('mongoose');
class SoldOut extends Base {

  constructor(test = SoldOut.test) {

    super('SoldOut', test);

    this.SoldOutModel = this.model;
  }

  getSoldOuts() {
    // return this.SoldOutModel.find().select({"name": 1})
  }

  insertProductInstance(productId, productInstanceId) {

    const soldOut = new this.SoldOutModel({
      product_id: mongoose.Types.ObjectId(productId),
      product_instance_id: mongoose.Types.ObjectId(productInstanceId)
    });
    return soldOut.save();
  }

  removeProductInstance(productId, productInstanceId) {

    return this.SoldOutModel.find({
      product_id: productId,
      product_instance_id: productInstanceId
    }).remove();
  }



}

SoldOut.test = false;

module.exports = SoldOut;