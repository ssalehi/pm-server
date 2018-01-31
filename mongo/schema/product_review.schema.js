const Schema = require('mongoose').Schema;

let schema_obj = {
  customer_id: {
    type: Schema.Types.ObjectId,
    required: true,
    unique: true,
    ref: 'Customer'
  },
  adding_time: {
    type: Date,
    default: new Date()
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  start_count: {
    type: Number,
    min: 0,
    max: 5
  },
  purchased_confirmed: Boolean,
  comment: String
};


let productReviewSchema = new Schema(schema_obj, {strict: true});

module.exports = productReviewSchema;
