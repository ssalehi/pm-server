const Schema = require('mongoose').Schema;

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  branch_code: {
    type: String,
    trim: true,
  },
  inventory_code: {
    type: String,
    trim: true,
  }
};


let offlineWarehouseSchema = new Schema(schema_obj, {
  collection: 'offline_warehouse',
  strict: true
});

module.exports = offlineWarehouseSchema;