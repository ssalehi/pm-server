const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  tag_group_id: Schema.Types.ObjectId
};


let tagSchema = new Schema(schema_obj, {collection: 'tag', strict: true});

module.exports = tagSchema;
