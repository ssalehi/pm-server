const Schema = require('mongoose').Schema;
const filterOptionListSchema = require('./filter_option_list.schema');

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  name_fa: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  productIds: [{type: Schema.Types.ObjectId, ref: 'Product'}],
  typeIds: [{type: Schema.Types.ObjectId, ref: 'ProductType'}],
  tagIds: [{type: Schema.Types.ObjectId, ref: 'Tag'}],
  brandIds: [{type: Schema.Types.ObjectId, ref: 'Brand'}],
  parent_id: Schema.Types.ObjectId,
  filter_options: [filterOptionListSchema]
};


let CollectionSchema = new Schema(schema_obj, {collection: 'collection', strict: true});

module.exports = CollectionSchema;
