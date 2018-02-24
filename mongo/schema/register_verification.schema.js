const Schema = require('mongoose').Schema;
const customerSchema = require('./customer.schema');

let schema_obj = {
  code: {
    type: Number,
    required: true,
  },
  customer_data: customerSchema,
  secret: {
    type: String,
  },
};

let registerVerificationSchema = new Schema(schema_obj, {strict: true});

module.exports = registerVerificationSchema;
