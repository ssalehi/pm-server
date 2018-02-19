const Schema = require('mongoose').Schema;
const PlacementInfoSchema = require('./placement_info.schema');
let schema_obj = {
  component_name: String,
  variable_name: String,
  start_date: Date,
  end_date: Date,
  info: PlacementInfoSchema,
};

let PlacementSchema = new Schema(schema_obj, {strict: true});

module.exports = PlacementSchema;
