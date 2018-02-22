const Base = require('./base.model');

class ProductType extends Base {

  constructor(test = ProductType.test) {

    super('ProductType', test);

    this.ProductTypeModel = this.model;
  }

  search(options, offset, limit) {
    return this.ProductTypeModel.find({name: {$regex: options.phrase, $options: 'i'}})
      .skip(offset)
      .limit(limit)
      .select({"name": 1})
  }
}

ProductType.test = false;

module.exports = ProductType;