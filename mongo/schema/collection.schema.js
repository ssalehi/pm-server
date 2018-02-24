const Schema = require('mongoose').Schema;

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  productIds: [{type: Schema.Types.ObjectId, ref: 'Product'}],
  is_smart: {
    type: Boolean,
    default: false
  },
  typeIds: [{type: Schema.Types.ObjectId, ref: 'ProductType'}],
  tagIds: [{type: Schema.Types.ObjectId, ref: 'Tag'}],
  tagGroupIds: [{type: Schema.Types.ObjectId, ref: 'TagGroup'}],
  parent_id: Schema.Types.ObjectId
};


let CollectionSchema = new Schema(schema_obj, {strict: true});

module.exports = CollectionSchema;
