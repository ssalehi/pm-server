const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  is_required: {
    type: Boolean,
    default: false
  }
};


let tagGroupSchema = new Schema(schema_obj, {collection: 'tag_group', strict: true});

module.exports = tagGroupSchema;
