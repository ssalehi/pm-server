const Schema = require('mongoose').Schema;
const CampaignCollection = require('./campaign_collection.schema');


let schema_obj = {
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  discount_ref:Number,
  start_date: Date,
  end_date: Date,
  image_url: {
    type: Schema.Types.ObjectId,
    ref: 'Image'
  },
  coupon_code: String,
  tags: [{type: Schema.Types.ObjectId, ref: 'Tag'}],
  desc: String,
  loyalty_group_id:{
    type: Schema.Types.ObjectId,
    ref: 'LoyaltyGroup'
  },
  campaign_collection_ids: [CampaignCollection]
};


let CampaignSchema = new Schema(schema_obj, {collection: 'campaign', strict: true});

module.exports = CampaignSchema;
