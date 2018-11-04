const Schema = require('mongoose').Schema;


inventory_template = {
  warehouse_id: {
    type: Schema.Types.ObjectId,
    required: true,
    // unique: true,
    ref: 'Warehouse'
  },
  count: {
    type: Number,
    required: true,
    min: 0
  },
  reserved: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }

};


let schema_obj = {
  product_color_id: Schema.Types.ObjectId,
  size: {
    type: String,
    required: true
  },
  price: Number,
  barcode: {
    type: String,
    required: true,
  },
  sold_out: {
    type: Boolean,
    required: true,
    default: false
  },
  inventory: [inventory_template]
};


let ProductInstanceSchema = new Schema(schema_obj, {collection: 'product_instance', strict: true});

module.exports = ProductInstanceSchema;
