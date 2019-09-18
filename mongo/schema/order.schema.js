const Schema = require('mongoose').Schema;
const OrderLineSchema = require('./order_line.schema');
const addressSchema = require('./address.schema');
const TicketSchema = require('./ticket.schema');

let time_slot_template = {
  lower_bound: {
    type: Number,
    // required: true,
  },
  upper_bound: {
    type: Number,
    // required: true,
  },
};

let loyalty_template = {
  delivery_spent: {
    type: Number,
  },
  shop_spent: {
    type: Number,
  },
  delivery_value: {
    type: Number,
  },
  shop_value: {
    type: Number,
  },
  earn_point: {
    type: Number,
  },
  final_point: {
    type: Number,
  },
};

let IPG_template = {
  result: {
    type: String,
  },
  action: {
    type: String,
  },
  invoice_number: {
    type: String,
  },
  invoice_date: {
    type: String,
  },
  transaction_id: {
    type: String,
  },
  trace_number: {
    type: String,
  },
  reference_number: {
    type: String,
  },
  transaction_date: {
    type: Date,
  },
  terminal_code: {
    type: String,
  },
  merchant_code: {
    type: String,
  },
  amount: {
    type: Number,
  }
};

let delivery_template = {
  duration_days: {
    type: Number
  },
  delivery_cost: {
    type: Number
  },
  delivery_discount: {
    type: Number
  },
  delivery_expire_day: {
    type: Date,
  },
  time_slot: time_slot_template,

};

let schema_obj = {
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  transaction_id: {
    type: String,
  },
  address: {
    type: addressSchema,
    // required: true
  },
  total_amount: {
    type: Number,
    required: true,
    default: 0
  },
  used_point: {
    type: Number,
    required: true,
    default: 0
  },
  used_balance: {
    type: Number,
    required: true,
    default: 0
  },
  order_time: {
    type: Date,
    // required: true,
  },
  is_collect: {
    type: Boolean,
    default: false,
    required: true
  },
  
  coupon_code: String,
  coupon_discount: Number,
  
  is_cart: {
    type: Boolean,
    default: false,
  },
  
  order_lines: [OrderLineSchema],
  
  is_offline: {
    type: Boolean,
    required: true,
    default: false
  },

  delivery_info: delivery_template,

  
  loyalty: loyalty_template,
  
  tickets: {
    type: [TicketSchema],
    default: []
  },
  invoice_number: {
    type: String,
  },
  IPG_data: IPG_template,
};


let OrderSchema = new Schema(schema_obj, {collection: 'order', strict: true});

module.exports = OrderSchema;
