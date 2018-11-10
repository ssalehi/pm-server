const Schema = require('mongoose').Schema;


let schema_obj = {
  province: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  min_price: {
    type: Number,
    required: true,
  }
};

let FreeDeliveryOptionSchema = new Schema(schema_obj, {collection: 'free_delivery_option', strict: true});

module.exports = FreeDeliveryOptionSchema;
