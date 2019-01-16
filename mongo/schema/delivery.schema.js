const Schema = require('mongoose').Schema;
const TicketSchema = require('./ticket.schema');
const addressSchema = require('./address.schema');


point_template = {
  customer: {
    _id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer'
    },
    address: addressSchema
  },
  warehouse_id: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  }
};


slot_template = {
  lower_bound: Number,
  upper_bound: Number,
};

let schema_obj = {
  order_details: [{
    order_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Order'
    },
    order_line_ids: [{
      type: Schema.Types.ObjectId,
      required: true,
    }]
  }],
  to: point_template,
  from: point_template,
  delivery_agent: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  start: Date,
  delivery_start: Date,
  delivery_end: Date,
  shelf_code: String,
  delivered_evidence: String,
  tickets: [TicketSchema],
  expire_date: Date,
  slot: slot_template,
};

let DeliverySchema = new Schema(schema_obj, {collection: 'delivery', strict: true});

module.exports = DeliverySchema;
