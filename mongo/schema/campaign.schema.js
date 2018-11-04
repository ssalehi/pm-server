const Schema = require('mongoose').Schema;


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  discount_ref: Number,
  start_date: Date,
  end_date: Date,
  coupon_code: String,
  loyalty_group_id: {
    type: Schema.Types.ObjectId,
    ref: 'LoyaltyGroup'
  },
  collection_ids: [{
    type: Schema.Types.ObjectId,
    ref: 'Collection'
  }]
};


let CampaignSchema = new Schema(schema_obj, {collection: 'campaign', strict: true});

module.exports = CampaignSchema;
