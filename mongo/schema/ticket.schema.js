const Schema = require('m ongoose').Schema;
let schema_obj = {
  warehouse_id: Schema.Types.ObjectId,
  status: Number,
  desc: String,
  timestamp: { type: Date, default: Date.now },
  is_processed: {type: Boolean, default: false}
};


let TicketSchema = new Schema(schema_obj, {strict: true});

module.exports = TicketSchema ;
