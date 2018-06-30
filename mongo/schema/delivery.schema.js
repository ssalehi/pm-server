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
  is_return: {
    type: Boolean,
    required: true,
    default: false,
  },
  completed_by: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  delivery_agent: {
    type: Schema.Types.ObjectId,
    ref: 'Agent'
  },
  start: Date,
  end: Date,
  delivery_start: Date,
  delivery_end: Date,
  shelf_code: String,
};

let DeliverySchema = new Schema(schema_obj, {collection: 'delivery', strict: true});

module.exports = DeliverySchema;
