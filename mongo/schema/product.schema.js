const Schema = require('mongoose').Schema;
const ProductReview = require('./product_review.schema');
const ProductColor = require('./product_color.schema');
const ProductInstanceSchema = require('./product_instance.schema');

/**
 * nested schemas have no need to indexes such as unique. so it is not possible to use main schemas
 */
let nested_brand_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  brand_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Brand'
  },
};
let nestedBrandSchema = new Schema(nested_brand_obj, {strict: true});


let nested_type_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  product_type_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'ProductType'
  },
};
let nestedProductTypeSchema = new Schema(nested_type_obj, {strict: true});

let nested_tag_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  tg_name: {
    type: String,
    required: true,
    trim: true,
  },
  tag_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Tag'
  },

};


let nestedTagSchema = new Schema(nested_tag_obj, {strict: true});


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  product_type: nestedProductTypeSchema,
  brand: nestedBrandSchema,
  base_price: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  article_no: {
    type: String,
    required: true,
    unique: true
  },
  desc: String,
  details: Schema.Types.String,
  tags: [nestedTagSchema],
  reviews: [ProductReview],
  colors: [ProductColor],
  instances: [ProductInstanceSchema],
  campaigns: [{type: Schema.Types.ObjectId, ref: 'Campaign', default: []}]
};


let ProductSchema = new Schema(schema_obj, {collection: 'product', strict: true});

module.exports = ProductSchema;
