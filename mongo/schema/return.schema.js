const Schema = require('mongoose').Schema;

let schema_obj = {
  order_line_id: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  requested_time: {
    type: Date,
    required: true
  },
  address_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  processed_by: {
    type: Schema.Types.ObjectId,
    require: true,
    ref: 'Agent'
  },
  warehouse_id: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  delivery_id: {
    type: Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  damaged: {
    type: Boolean,
    default: false
  }
};


let ReturnSchema = new Schema(schema_obj, {strict: true});

module.exports = ReturnSchema;
