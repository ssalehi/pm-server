const Schema = require('mongoose').Schema;
let schema_obj = {
  warehouse_id:{
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  status: Number,
  desc: {type: Schema.Types.Mixed},
  timestamp: {type: Date, default: Date.now},
  is_processed: {type: Boolean, default: false, required: true},
  referral_advice: {type: Number},
  agent_id: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  }
};


let TicketSchema = new Schema(schema_obj, {strict: true});

module.exports = TicketSchema;
