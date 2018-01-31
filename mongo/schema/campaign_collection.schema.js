const Schema = require('mongoose').Schema;


let schema_obj = {
  collection_id: {
    type: Schema.Types.ObjectId,
    ref: 'Collection',
    unique: true
  },
  discount_diff:Number,
  start_date: Date,
  end_date: Date,
};


let CampaignCollectionSchema = new Schema(schema_obj, {strict: true});

module.exports = CampaignCollectionSchema;
