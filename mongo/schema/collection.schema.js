const Schema = require('mongoose').Schema;

let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  image_url: {
    type: Schema.Types.ObjectId,
    ref: 'Image'
  },
  productIds: [{type: Schema.Types.ObjectId, ref: 'Product'}],
  parent_id: Schema.Types.ObjectId
};


let CollectionSchema = new Schema(schema_obj, {strict: true});

module.exports = CollectionSchema;
