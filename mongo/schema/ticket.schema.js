const Schema = require('mongoose').Schema;
let schema_obj = {
  receiver_id:{
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  status: Number,
  desc: Schema.Types.Mixed,
  timestamp: {type: Date, default: Date.now},
  is_processed: {type: Boolean, default: false, required: true},
  agent_id: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  }
};


let TicketSchema = new Schema(schema_obj, {strict: true});

module.exports = TicketSchema;
