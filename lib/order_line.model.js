const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class OrderLine extends Base {

  constructor(test = OrderLine.test) {

    super('OrderLine', test);

    this.OrderLineModel = this.model;
  }

  createOrderLine(product_instance_id) {
    return this.OrderLineModel.create({product_instance_id});
  }

}

OrderLine.test = false;

module.exports = OrderLine;