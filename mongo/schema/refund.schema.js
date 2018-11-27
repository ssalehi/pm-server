const Schema = require('mongoose').Schema;

let schema_obj = {
  customer_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Customer'
  },
  status: Number,
  requested_time: {
    type: Date,
  },
  executed_time: {
    type: Date,
  },
  card_no: {
    type: String,
    trim: true,
  },
  sheba_no: {
    type: String,
    trim: true,
  },
  tracking_no: {
    type: Number,
    trim: true,
  },
  comment: {
    type: Schema.Types.Mixed,
  },
  owner_card_name: {
    type: String,
    required: true,
    trim: true,
  },
  owner_card_surname: {
    type: String,
    required: true,
    trim: true,
  },
  bank_name: {
    type: String,
  },
  amount: {
    type: Number,
    default: 0,
  }
};


let RefundSchema = new Schema(schema_obj, {collection: 'refund', strict: true});

module.exports = RefundSchema;
