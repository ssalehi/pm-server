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
  invoiceNumber : {
    type: String,
  },
  invoiceDate : {
    type: Date,
  },
  transaction_id: {
    type: String,
  },

};

let receiver_info = {
  recipient_email: String,
  recipient_name: String,
  recipient_surname: String,
  recipient_title: String,
  recipient_national_id: String,
  recipient_mobile_no: String
}

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
  discount: Number,
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
  invoice_no: String,

  duration_days: {      // delivery-periode-days references to delivery_duration_info schema
    type: Number,
    trim: true,
  },
  time_slot: time_slot_template,
  // delivery_duration: delivery_duration_template,
  loyalty: loyalty_template,

  receiver_info,
  tickets: {
    type: [TicketSchema],
    default: []
  },
  delivery_expire_day: {
    type: Date,
  },
  invoiceNumber: {
    type: String,
  },
  IPG_data: IPG_template,
};


let OrderSchema = new Schema(schema_obj, {collection: 'order', strict: true});

module.exports = OrderSchema;
