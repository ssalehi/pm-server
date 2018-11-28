const Schema = require('mongoose').Schema;
const TicketSchema = require('./ticket.schema');

let schema_obj = {
  product_instance_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  paid_price: {
    type: Number,
    required: true,
    default: 0
  },
  adding_time: {
    type: Date,
    default: Date.now,
    required: true
  },
  campaign_id: {
    type: Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  collection_id: {
    type: Schema.Types.ObjectId,
    ref: 'Collection'
  },
  warehouse_id: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  tickets: {
    type: [TicketSchema],
    default: []
  }
};

let OrderLineSchema = new Schema(schema_obj, {strict: true});

module.exports = OrderLineSchema;
