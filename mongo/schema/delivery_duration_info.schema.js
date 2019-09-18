const Schema = require('mongoose').Schema;


cities_template = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  delivery_cost: {
    type: Number,
  }
};

loyalty_template = {
  _id: {
    type: Schema.Types.ObjectId,
    // required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true
  },
  discount: {
    type: Number
  }
};


add_point_template = {
  _id: {
    type: Schema.Types.ObjectId,
    // required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  
  added_point: {
    type: String,
    required: true,
    default: 0,
    trim: true,
  }
};

let schema_obj = {
  is_collect: {
    type: Boolean,
    required: true,
    default: false,
  },
  name: {
    type: String,
    trim: true,
    unique: true
  },
  delivery_days: {
    type: Number,
    unique: true
  },
  cities: [cities_template],
  delivery_loyalty: [loyalty_template],
  add_point: [add_point_template]
};

let deliveryDurationInfoSchema = new Schema(schema_obj, {collection: 'delivery_duration_info', strict: true});

module.exports = deliveryDurationInfoSchema;
