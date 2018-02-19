const Schema = require('mongoose').Schema;
const PlacementSchema = require('./placement.schema');
const PageInfoSchema = require('./page_info.schema');

let schema_obj = {
  address: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  is_app: {
    type: Boolean,
    required: true
  },
  placement: [PlacementSchema],
  page_info: PageInfoSchema,
};

let PageSchema = new Schema(schema_obj, {strict: true});
module.exports = PageSchema;
