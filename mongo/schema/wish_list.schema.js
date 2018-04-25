const Schema = require('mongoose').Schema;

let schema_obj = {
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  product_instance_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  adding_time: {
    type: Date,
    default: Date.now,
    required: true
  }
};

let wishListItemSchema = new Schema(schema_obj, {strict: true});


module.exports = wishListItemSchema;
