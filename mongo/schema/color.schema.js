const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  // hex: String,
  color_id: {
    type: String,
    required: true,
  },
};


let colorSchema = new Schema(schema_obj, {collection: 'color', strict: true});

module.exports = colorSchema;
