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
    type: Number,
  },
  no: {
    type: Number,
  },
  postal_code: {
    type: Number,
    // required: true
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
    required: true,
  },
  recipient_name: {
    type: String,
    trim: true,
  },
  recipient_surname: {
    type: String,
    trim: true,
  },
  recipient_national_id: {
    type: String,
    required: true,
    trim: true,
  },
  recipient_mobile_no: {
    type: String,
    required: true,
    trim: true,
  }
};


let addressSchema = new Schema(schema_obj, {collection: 'address', strict: true});


module.exports = addressSchema;
