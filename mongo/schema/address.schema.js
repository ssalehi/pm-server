const Schema = require('mongoose').Schema;

let schema_obj = {
  city: {
    type: String,
    trim: true,
    required: true
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
  }
};


let addressSchema = new Schema(schema_obj, {collection: 'address', strict: true});


module.exports = addressSchema;
