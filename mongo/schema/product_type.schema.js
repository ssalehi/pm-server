const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
};


let productTypeSchema = new Schema(schema_obj, {collection: 'product_type', strict: true});

module.exports = productTypeSchema;
