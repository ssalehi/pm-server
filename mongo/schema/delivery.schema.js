const Schema = require('mongoose').Schema;


send_template = {

  customer: {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'Customer'
    },
    address_id: Schema.Types.ObjectId
  },
  warehouse_id: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  }
};

return_template = {
  warehouse_id: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  }
};

let schema_obj = {
  order_id: {
    type: Schema.Types.ObjectId,
    require: true,
    ref: 'Order'
  },
  order_line_id: {
    type: Schema.Types.ObjectId,
    require: true,
  },
  send: send_template,
  return: return_template,
  processed_by: {
    type: Schema.Types.ObjectId,
    require: true,
    ref: 'Agent'
  },
  start_time: {
    type: Date,
    required: true
  },
  end_time: Date
};




let DeliverySchema = new Schema(schema_obj, {strict: true});

module.exports = DeliverySchema;
