const Schema = require('mongoose').Schema;

let schema_obj = {
  name: {
    type: String,
    required: true
  },
  name_fa: {
    type: String,
    required: true
  },
  checked: {
    type: Boolean,
    default: true,
  },
};

let filterOptionListSchema = new Schema(schema_obj, {strict: true});


module.exports = filterOptionListSchema;
