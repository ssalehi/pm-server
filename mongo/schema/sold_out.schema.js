const Schema = require('mongoose').Schema;


let schema_obj = {
  product_id: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  product_instance_id: {
    type: Schema.Types.ObjectId,
    required: true
  },
  sold_out_date: Date,
  expiration_date: Date, // this is the date when content manager sees the product in the sold out page in admin panel (it is normally one week after sold_out_date)
};


let SoldOutSchema = new Schema(schema_obj, {collection: 'sold_out', strict: true});
SoldOutSchema.index({product_id: 1, product_instance_id: 1}, {unique: true});

module.exports = SoldOutSchema;

