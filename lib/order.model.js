const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');

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
              path: '$campaign.collection_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              _id: '$order_line_ids.product_instance_id',
              product_id: {$first: '$order_line_ids.product_id'},
              quantity: {$sum: 1},
              campaign_id: {$first: '$campaign._id'},
              collection_id: {$first: '$campaign.collection_ids._id'},
              campaign_start_date: {$first: '$campaign.start_date'},
              campaign_end_date: {$first: '$campaign.end_date'},
              campaign_discount_ref: {$first: '$campaign.discount_ref'},
              campaign_loyalty_group_id: {$first: '$campaign.loyalty_group_id'},
              collection_discount_diff: {$first: '$campaign.collection_ids.discount_diff'},
              collection_start_date: {$first: '$campaign.collection_ids.start_date'},
              collection_end_date: {$first: '$campaign.collection_ids.end_date'},
            }
          }
        ])
          .then(res => {
            overallDetails = res;
            console.log('productIds: ', Array.from(new Set(res.map(el => el.product_id))));
            return (new ProductModel(Order.test)).getProductDetailsByIds(Array.from(new Set(res.map(el => el.product_id))));
          })
          .then(res => {
            console.log('products: ', res);

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
            console.error('An error occurred in getCartItems function: ', err);
            reject(err);
          });
      }
    });
  }
}

Order.test = false;
module.exports = Order;