const Schema = require('mongoose').Schema;


duration_cities_template  = {
  name: {
    type: String,
    required: true,
    trim: true,
  },
  delivery_cost: {
    type: Number,
  }
};


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  duration_value: {
    type: Number,
    required: true,
    unique:true
  },
  duration_cities: [duration_cities_template],
  // loyalty_points:[{type: Schema.Types.ObjectId, ref: 'loyaltyGroup'}],
};

let deliveryDurationInfoSchema = new Schema(schema_obj, {collection: 'delivery_duration_info', strict: true});

module.exports = deliveryDurationInfoSchema;
