const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  tag_group_id: Schema.Types.ObjectId
};


let tagSchema = new Schema(schema_obj, {collection: 'tag', strict: true});
tagSchema.index({name: 1, tag_group_id: 1}, {unique: true});


module.exports = tagSchema;
