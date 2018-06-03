const Schema = require('mongoose').Schema;


point_template = {
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
  order_details: [{
    order_id: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Order'
    },
    order_line_ids: [{
      type: Schema.Types.ObjectId,
      required: true,
    }],
    completed_order: {
      type: Boolean,
      default: false,
    }
  }],
  to: point_template,
  from: point_template,
  return: point_template,
  processed_by: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  created_at: Date,
  start_date: Date,
  end_date: Date
};

let DeliverySchema = new Schema(schema_obj, {collection: 'delivery', strict: true});

module.exports = DeliverySchema;
