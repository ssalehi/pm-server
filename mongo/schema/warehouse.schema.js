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
  }
};


let warehouseSchema = new Schema(schema_obj, {collection: 'warehouse', strict: true});

module.exports = warehouseSchema;
