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

loyalty_info_template = {
  _id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
  } ,
  price: {
    type: Number,
    required: true
  },
  discount:{
    type: Number,
    required: true,
  }
}


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
  duration_loyalty_info: [loyalty_info_template]
};

let deliveryDurationInfoSchema = new Schema(schema_obj, {collection: 'delivery_duration_info', strict: true});

module.exports = deliveryDurationInfoSchema;
