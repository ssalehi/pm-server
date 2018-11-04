const Schema = require('mongoose').Schema;
const Address = require('./address.schema');

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  address: {
    type: Address,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  has_customer_pickup: {
    type: Boolean,
    default: false,
  },
  is_hub: {
    type: Boolean,
    required: true,
    default: false
  },
  priority: {
    type: Number,
    required: true,
    unique: true,
    min: 0
  },
  ip_address: String
};


let warehouseSchema = new Schema(schema_obj, {collection: 'warehouse', strict: true});

module.exports = warehouseSchema;
