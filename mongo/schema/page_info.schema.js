const Schema = require('mongoose').Schema;

let schema_obj = {
  collection_id: {
    type: Schema.Types.ObjectId,
    ref: 'Collection',
    // unique: true,
  },
  content: String, // html content if needed
  title: {
    type: String,
  }
};

let PageInfoSchema = new Schema(schema_obj, {strict: true});
module.exports = PageInfoSchema;
