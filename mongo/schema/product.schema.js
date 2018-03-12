const Schema = require('mongoose').Schema;
const ProductReview = require('./product_review.schema');
const ProductColor = require('./product_color.schema');
const ProductInstanceSchema = require('./product_instance.schema');

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
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
  date: {
    type: Date,
    default: Date.now
  },
  desc: String,
  details: Schema.Types.Mixed,
  tags: [{type: Schema.Types.ObjectId, ref: 'Tag'}],
  reviews: [ProductReview],
  colors: [ProductColor],
  instances: [ProductInstanceSchema],
  campaigns:[{type: Schema.Types.ObjectId, ref: 'Campaign'}]

};

let ProductSchema = new Schema(schema_obj, {collection: 'product', strict: true});
ProductSchema.index({name: 1, product_type: 1}, {unique: true});

module.exports = ProductSchema;
