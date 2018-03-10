const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const models = require('../mongo/models.mongo');

class Order extends Base {
  constructor(test = Order.test) {
    super('Order', test);
    this.OrderModel = this.model;
  }

  getCartItems(user, body) {
    if (!user && (!body || !body.data))
      return Promise.reject(error.instanceDataRequired);

    let overallDetails = null;

    return new Promise((resolve, reject) => {
      // Check user is logged in or not
      // If user is logged in get instance_ids of order-line
      if (user) {
        this.OrderModel.aggregate([
          {
            $match: {customer_id: user.id, address_id: {$exists: false}, is_cart: true}
          },
          {
            $unwind: {
              path: '$order_line_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $lookup: {
              from: 'campaign',
              localField: 'order_line_ids.campaign_id',
              foreignField: '_id',
              as: 'campaign'
            }
          },
          {
            $unwind: {
              path: '$campaign',
              preserveNullAndEmptyArrays: true,
            }
          },
          {
            $unwind: {
              path: '$campaign.campaign_collection_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              // _id: {
              //   pii: '$order_line_ids.product_instance_id',
              //   pcai: '$campaign._id',
              //   pcoi: '$campaign.campaign_collection_ids.collection_id',
              // },
              _id: '$order_line_ids.product_instance_id',
              product_id: {$first: '$order_line_ids.product_id'},
              quantity: {$sum: 1},
              campaign_id: {$first: '$campaign._id'},
              collection_id: {$first: '$campaign.campaign_collection_ids._id'},
              campaign_start_date: {$first: '$campaign.start_date'},
              campaign_end_date: {$first: '$campaign.end_date'},
              campaign_discount_ref: {$first: '$campaign.discount_ref'},
              campaign_loyalty_group_id: {$first: '$campaign.loyalty_group_id'},
              collection_discount_diff: {$first: '$campaign.campaign_collection_ids.discount_diff'},
              collection_start_date: {$first: '$campaign.campaign_collection_ids.start_date'},
              collection_end_date: {$first: '$campaign.campaign_collection_ids.end_date'},
            }
          }
        ])
          .then(res => {
            overallDetails = res;
            return (new ProductModel(Order.test)).getProductDetailsByIds(Array.from(new Set(res.map(el => mongoose.Types.ObjectId(el.product_id)))));
          })
          .then(res => {
            overallDetails.forEach(el => {
              el.instance_id = el._id;
              const tempCurrentProduct = res.find(i => i._id.equals(el.product_id));
              let instances = [];

              if (tempCurrentProduct) {
                const tempCurrentInstance = tempCurrentProduct.instances
                  .find(i => i._id.equals(el.instance_id));

                const colorId = tempCurrentInstance.product_color_id;

                el.name = tempCurrentProduct.name;
                el.base_price = tempCurrentProduct.base_price;
                el.size = tempCurrentInstance.size;
                el.instance_price = tempCurrentInstance.price;
                el.tags = tempCurrentProduct.tags;
                el.count = tempCurrentInstance.inventory.reduce((a, b) => a.count + b.count);
                const tempColorImage = tempCurrentProduct.colors.find(i => i.color_id && i.color_id.equals(colorId));
                el.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                el.color = tempColorImage ? {
                  id: tempColorImage.id,
                  color_id: tempColorImage.color_id,
                  name: tempColorImage.name,
                } : {};

                tempCurrentProduct.instances.forEach(item => {
                  instances.push({
                    instance_id: item._id,
                    size: item.size,
                    price: item.price,
                    quantity: item.inventory.reduce((a, b) => a.count + b.count),
                  });
                });
              }

              el.instances = instances;
            });

            resolve(overallDetails);
          })
          .catch(err => {
            console.error('An error occurred in getCartItems function (user is logged in): ', err);
            reject(err);
          });
      } else {
        let campaignCollectionData = null;

        //If user is not logged in
        models['Campaign' + (Order.test ? 'Test' : '')].aggregate([
          {
            $match: {_id: {$in: Array.from(new Set(body.data.filter(el => el.campaign_id).map(el => mongoose.Types.ObjectId(el.campaign_id))))}}
          },
          {
            $unwind: {
              path: '$campaign_collection_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {'campaign_collection_ids.collection_id': {$in: Array.from(new Set(body.data.map(el => mongoose.Types.ObjectId(el.collection_id))))}}
          },
          {
            $group: {
              _id: '$_id',
              campaign_id: {$first: '$_id'},
              collection_id: {$first: '$campaign_collection_ids._id'},
              campaign_start_date: {$first: '$start_date'},
              campaign_end_date: {$first: '$end_date'},
              campaign_discount_ref: {$first: '$discount_ref'},
              campaign_loyalty_group_id: {$first: '$loyalty_group_id'},
              collection_discount_diff: {$first: '$campaign_collection_ids.discount_diff'},
              collection_start_date: {$first: '$campaign_collection_ids.start_date'},
              collection_end_date: {$first: '$campaign_collection_ids.end_date'},
            }
          }
        ])
          .then(res => {
            campaignCollectionData = res;
            return (new ProductModel(Order.test)).getProductDetailsByIds(Array.from(new Set(body.data.map(el => mongoose.Types.ObjectId(el.product_id)))));
          })
          .then(res => {
            let resultData = [];

            //Remote duplicate data
            let data = [];
            body.data.forEach(el => {
              const temp = data.find(i => {
                if (i &&
                  i.product_id && el.product_id && i.product_id.toString() === el.product_id.toString()
                  && i.instance_id && el.instance_id && i.instance_id.toString() === el.instance_id.toString()
                  && i.campaign_id && el.campaign_id && i.campaign_id.toString() === el.campaign_id.toString()
                  && i.collection_id && el.collection_id && i.collection_id.toString() === el.collection_id.toString())
                  return true;
              });
              if (!temp)
                data.push(el);
            });

            data.forEach(el => {
              let objData = {};

              const campaignData = campaignCollectionData.find(i => i.campaign_id.equals(el.campaign_id));

              // Details of campaign and related collection
              if (campaignData) {
                objData.campaign_id = campaignData.campaign_id;
                objData.collection_id = campaignData.collection_id;
                objData.campaign_start_date = campaignData.campaign_start_date;
                objData.campaign_end_date = campaignData.campaign_end_date;
                objData.campaign_discount_ref = campaignData.campaign_discount_ref;
                objData.campaign_loyalty_group_id = campaignData.campaign_loyalty_group_id;
                objData.collection_discount_diff = campaignData.collection_discount_diff;
                objData.collection_start_date = campaignData.collection_start_date;
                objData.collection_end_date = campaignData.collection_end_date;
              }

              // Details of product and related instances
              const tempProductData = res.find(i => i._id.equals(el.product_id));
              let instances = [];

              if (tempProductData) {
                const tempProductInstanceData = tempProductData.instances.find(i => i._id.equals(el.instance_id));
                const colorId = tempProductInstanceData.product_color_id;

                objData.product_id = el.product_id;
                objData.instance_id = el.instance_id;
                objData.name = tempProductData.name;
                objData.base_price = tempProductData.base_price;
                objData.size = tempProductInstanceData.size;
                objData.instance_price = tempProductInstanceData.price;
                objData.tags = tempProductData.tags;
                objData.count = tempProductInstanceData.inventory.reduce((a, b) => a.count + b.count);
                const tempColorImage = tempProductData.colors.find(i => i.color_id && i.color_id.equals(colorId));
                objData.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                objData.color = tempColorImage ? {
                  id: tempColorImage.id,
                  color_id: tempColorImage.color_id,
                  name: tempColorImage.name
                } : {};

                tempProductData.instances.forEach(item => {
                  instances.push({
                    instance_id: item._id,
                    size: item.size,
                    price: item.price,
                    quantity: item.inventory.reduce((a, b) => a.count + b.count),
                  });
                });

                objData.instances = instances;
              }

              // Set quantity for product's instance
              objData.quantity = body.data.filter(i => {
                if (i &&
                  i.product_id && el.product_id && i.product_id.toString() === el.product_id.toString()
                  && i.instance_id && el.instance_id && i.instance_id.toString() === el.instance_id.toString()
                  && i.campaign_id && el.campaign_id && i.campaign_id.toString() === el.campaign_id.toString()
                  && i.collection_id && el.collection_id && i.collection_id.toString() === el.collection_id.toString())
                  return true;
              }).length;

              resultData.push(objData);
            });

            resolve(resultData);
          })
          .catch(err => {
            console.error('An error occurred in getCartItems function (user is not logged in): ', err);
            reject(err);
          });
      }
    });
  }
}

Order.test = false;
module.exports = Order;

