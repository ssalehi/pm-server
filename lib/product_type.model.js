const Base = require('./base.model');

class ProductType extends Base {

  constructor(test = ProductType.test) {

    super('ProductType', test);

    this.ProductTypeModel = this.model;
  }

  getTypes() {
    return this.ProductTypeModel.find().select({"name": 1})
  }
}

ProductType.test = false;

module.exports = ProductType;