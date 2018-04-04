const Schema = require('mongoose').Schema;
let schema_obj = {
  warehouse_id: Schema.Types.ObjectId,
  status: Number,
  desc: String,
  timestamp: { type: Date, default: Date.now }
};


let TicketSchema = new Schema(schema_obj, {strict: true});

module.exports = TicketSchema ;
