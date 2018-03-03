const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  color: {
    name: String,
    code: Number
  },
};


let testSchema = new Schema(schema_obj, {collection: 'test', strict: true});

module.exports = testSchema;
