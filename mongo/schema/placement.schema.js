const Schema = require('mongoose').Schema;

let schema_obj = {
  url: {
    type: String,
    require: true,
  },
  placement_name: {
    type: String,
    required: true
  },
  collection_id: {
    type: Schema.Types.ObjectId,
    ref: 'Collection'
  },
  product_instance_id: Schema.Types.ObjectId,
  start_date: Date,
  end_date: Date,
  content: Schema.Types.Mixed
};


let PlacementSchema = new Schema(schema_obj, {strict: true});

module.exports = PlacementSchema;
