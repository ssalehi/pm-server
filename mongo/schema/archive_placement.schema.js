const Schema = require('mongoose').Schema;
const PlacementInfoSchema = require('./placement_info.schema');

let schema_obj = {
  page_id: {
    type: Schema.Types.ObjectId,
    ref: 'Page',
  },
  component_name: {
    type: String,
    required: true,
  },
  variable_name: String,
  start_date: {
    type: Date,
    required: true,
  },
  end_date: {
    type: Date,
    required: true,
  },
  info: PlacementInfoSchema,
};

let ArchivePlacementSchema = new Schema(schema_obj, {strict: true});
module.exports = ArchivePlacementSchema;