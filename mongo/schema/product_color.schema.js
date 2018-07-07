const Schema = require('mongoose').Schema;
let schema_obj = {
  color_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Color'
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  code: {
    type: String,
  },
  image: {
    thumbnail: {type: String, trim: true},
    angles: [{type: String, trim: true}]
  },
  images_imported: {
    type: Boolean,
    required: true,
    default: false
  }
};


let ProductColorSchema = new Schema(schema_obj, {collection: 'product_color', strict: true});

module.exports = ProductColorSchema;
