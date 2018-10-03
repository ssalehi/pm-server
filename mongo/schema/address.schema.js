const Schema = require('mongoose').Schema;

let schema_obj = {
  province: {
    type: String,
    trim: true,
    required: true,
  },
  city: {
    type: String,
    trim: true,
    required: true
  },
  district: {
    type: String,
    trim: true,
  },
  street: {
    type: String,
    required: true,
    trim: true,
  },
  unit: {
    type: String,
  },
  no: {
    type: String,
  },
  postal_code: {
    type: String,
  },
  loc: {
    type: {
      long: Number,
      lat: Number
    }
  },
  recipient_title: {
    type: String,
    enum: ['m', 'f'],
  },
  recipient_name: {
    type: String,
  },
  recipient_surname: {
    type: String,
    trim: true,
  },
  recipient_national_id: {
    type: String,
    trim: true,
  },
  recipient_mobile_no: {
    type: String,
    trim: true,
  }
};


let addressSchema = new Schema(schema_obj, {strict: true});


module.exports = addressSchema;
