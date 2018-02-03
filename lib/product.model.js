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
    let product = new this.ProductModel(body);
    return product.save();
  }


}

Product.test = false;

module.exports = Product;