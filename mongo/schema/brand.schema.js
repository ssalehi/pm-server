const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
};


let brandSchema = new Schema(schema_obj, {collection: 'brand', strict: true});

module.exports = brandSchema;
