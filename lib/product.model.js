/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Product extends Base {

  constructor(test = Product.test) {

    super('Product', test);

   this.ProductModel = this.model
  }

  save(body) {

    let product = new this.ProductModel({
      name: 'all star 700',
      product_type:  mongoose.Types.ObjectId(),
      brand: mongoose.Types.ObjectId(),
      base_price: 30000
    });
    return product.save().then(res => Promise.resolve('successful'));
  }


}

Product.test = false;

module.exports = Product;