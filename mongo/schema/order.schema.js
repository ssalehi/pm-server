 const Schema = require('mongoose').Schema;
const OrderLineSchema = require('./order_line.schema');

let schema_obj = {
  customer_id: {
    type: Schema.Types.ObjectId,
    ref: 'Customer'
  },
  transaction_id: Schema.Types.ObjectId,
  address_id: {
    type: Schema.Types.ObjectId,
  },
  total_amount: {
    type: Number,
    required: true,
    default: 0
  },
  used_point: Number,
  discount: Number,
  order_time: {
    type: Date,
    required: true,
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

};


let OrderSchema = new Schema(schema_obj, {collection: 'order', strict: true});

module.exports = OrderSchema;
