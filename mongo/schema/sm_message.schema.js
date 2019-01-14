const Schema = require('mongoose').Schema;


let schema_obj = {
  type: {
    type: Number,
    required: true,
  },
  order_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Order'
  },
  order_line_id: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  is_processed: {
    type: Boolean,
    required: true,
    default: false
  },
  publish_date: {
    type: Date,
    default: Date.now,
    required: true
  },
  process_date: {
    type: Date,
  },
  extra: {
    type: Schema.Types.Mixed
  },
  description: {
    type: String
  },
  is_closed: {
    type: Boolean,
    required: true,
    default: false
  },
  close_date: {
    type: Date,
  }
};


let smMessageSchema = new Schema(schema_obj, {collection: 'sm_message', strict: true});

module.exports = smMessageSchema;
