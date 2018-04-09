const Schema = require('mongoose').Schema;
const TicketSchema = require('./ticket.schema');


let schema_obj = {
  product_instance_id: Schema.Types.ObjectId,
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  paid_price: {
    type: Number,
    required: true,
    default: 0
  },
  adding_time: Date,
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
  tickets: [TicketSchema]
};

let OrderLineSchema = new Schema(schema_obj, {strict: true});

module.exports = OrderLineSchema;
