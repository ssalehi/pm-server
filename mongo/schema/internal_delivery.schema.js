const Schema = require('mongoose').Schema;


let schema_obj = {
agent_id: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Agent'
  },
  start_time: Date,
  is_active: {
    type: Boolean
  }
};

let InternalDeliverySchema = new Schema(schema_obj, {collection: 'internal_delivery', strict: true});

module.exports = InternalDeliverySchema;
