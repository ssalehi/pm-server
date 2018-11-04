const Base = require('./base.model');

class Brand extends Base {

  constructor(test = Brand.test) {

    super('Brand', test);

    this.BrandModel = this.model;
  }

  getBrands() {
    return this.BrandModel.find().select({"name": 1})
  }
}

Brand.test = false;

module.exports = Brand;