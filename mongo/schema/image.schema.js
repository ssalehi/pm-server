const Schema = require('mongoose').Schema;


let schema_obj = {
  url: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  alt: String,
};


let imageSchema = new Schema(schema_obj, {strict: true});

module.exports = imageSchema;
