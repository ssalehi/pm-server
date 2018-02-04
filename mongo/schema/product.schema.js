const Schema = require('mongoose').Schema;
const ProductReview = require('./product_review.schema');
const ProductColor = require('./product_color.schema');
const ProductInstanceSchema = require('./product_instance.schema');

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  product_type: {
    type: Schema.Types.ObjectId,
    ref: 'ProductType',
    required: true
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  base_price: {
    type: Number,
    required: true,
  },
  desc: String,
  tags: [{type: Schema.Types.ObjectId, ref: 'Tag'}],
  reviews: [ProductReview],
  colors:[ProductColor],
  instances:[ProductInstanceSchema],
};


let ProductSchema = new Schema(schema_obj, {strict: true});

module.exports = ProductSchema;
