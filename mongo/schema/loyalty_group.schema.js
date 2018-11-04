const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  min_score: {
    type: Number,
    required: true,
    unique: true,
  },
};


let loyaltyGroupSchema = new Schema(schema_obj, {collection: 'loyalty_group', strict: true});

module.exports = loyaltyGroupSchema;
