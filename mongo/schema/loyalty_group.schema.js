const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  icon_url: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  min_score: {
    type: Number,
    required: true,
  },
};


let loyaltyGroupSchema = new Schema(schema_obj, {strict: true});

module.exports = loyaltyGroupSchema;
