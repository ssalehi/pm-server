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

  /**
   * @param body
   *  customer_id : the id of the customer
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to add
   * @returns {Promise.<*>}
   */
  addToOrder(body) {
    let cid = body.customer_id;
    let piid = body.product_instance_id;
    let n = body.number || 1;

    if (!mongoose.Types.ObjectId.isValid(cid) || !mongoose.Types.ObjectId.isValid(piid))
      return Promise.reject(error.invalidId);

    // TODO: should check if we have more than 'n' number of product instance in our inventory

    return models['Customer' + (Order.test ? 'Test' : '')]
      .findOne({_id: cid})
      .then(res => {
        if (!res)
          return Promise.reject(error.customerIdNotValid);

        let newOrderLines = [];
        for (let i = 0; i < n; i++) {
          newOrderLines.push({
            product_instance_id: piid
          });
        }

        return this.OrderModel.update({
          customer_id: cid,
          //and also another field like: 'is_basket: true'
          is_cart: true,
        }, {
          $addToSet: {
            'order_line_ids': {
              $each: newOrderLines
            }
          }
        }, {
          upsert: true
        })
      });
  }


  /**
   * @param body
   *  customer_id : the id of the customer
   *  product_instance_id : the id of the product instance
   *  number : the number of product instances we want to remove
   * @returns {Promise.<*>}
   */
  removeFromOrder(body) {
    let cid = body.customer_id;
    let piid = body.product_instance_id;
    let n = body.number || -1;

    if (!mongoose.Types.ObjectId.isValid(cid) || !mongoose.Types.ObjectId.isValid(piid))
      return Promise.reject(error.invalidId);


    return models['Customer' + (Order.test ? 'Test' : '')]
      .findOne({_id: cid})
      .then(res => {
        if (!res)
          return Promise.reject(error.customerIdNotValid);

        if (n === -1 || n === null) {
          return this.OrderModel.update({
            customer_id: cid, is_cart: true
          }, {
            $pull: {
              'order_line_ids': {
                product_instance_id: piid
              }
            }
          }, {
            multi: true
          });
        }
        else {

          return this.OrderModel.aggregate([
            {
              $match: {customer_id: mongoose.Types.ObjectId(cid), is_cart: true}
            },
            {
              $unwind: {
                path: '$order_line_ids',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $match: {'order_line_ids.product_instance_id': mongoose.Types.ObjectId(piid)}
            },
            {
              $limit: n
            }
          ])
            .then(res => {
              let ids = res.map(x => x.order_line_ids._id);
              return this.OrderModel.update({
                customer_id: cid,
              }, {
                $pull: {
                  'order_line_ids': {
                    _id: {$in: ids}
                  }
                }
              })
            });
        }
      });
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
            $match: {customer_id: mongoose.Types.ObjectId(user.id), address_id: {$exists: false}, is_cart: true}
          },
          {
            $unwind: {
              path: '$order_line_ids',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              _id: '$order_line_ids.product_instance_id',
              product_id: {$first: '$order_line_ids.product_id'},
              quantity: {$sum: 1},
            }
          }
        ])
          .then(res => {
            overallDetails = res;
            return (new ProductModel(Order.test)).getProducts(Array.from(new Set(res.map(el => mongoose.Types.ObjectId(el.product_id)))), null, null, true);
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

                el.discount = tempCurrentProduct.discount;
                el.name = tempCurrentProduct.name;
                el.base_price = tempCurrentProduct.base_price;
                el.size = tempCurrentInstance.size;
                el.instance_price = tempCurrentInstance.price;
                el.tags = tempCurrentProduct.tags;
                el.count = tempCurrentInstance.inventory.length > 0 ? tempCurrentInstance.inventory.reduce((a, b) => a.count + b.count) : 0;

                const tempColorImage = tempCurrentProduct.colors.find(i => i._id && i._id.equals(colorId));
                el.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                el.color = tempColorImage ? {
                  id: tempColorImage._id,
                  color_id: tempColorImage.color_id,
                  name: tempColorImage.name,
                } : {};

                tempCurrentProduct.instances.forEach(item => {
                  instances.push({
                    instance_id: item._id,
                    size: item.size,
                    price: item.price,
                    quantity: item.inventory.length > 0 ? item.inventory.reduce((a, b) => a.count + b.count) : 0,
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
        (new ProductModel(Order.test)).getProducts(Array.from(new Set(body.data.map(el => mongoose.Types.ObjectId(el.product_id)))), null, null, true)
          .then(res => {
            let resultData = [];

            //Remote duplicate data
            let data = [];
            body.data.forEach(el => {
              const temp = data.find(i => {
                if (i &&
                  i.product_id && el.product_id && i.product_id.toString() === el.product_id.toString()
                  && i.instance_id && el.instance_id && i.instance_id.toString() === el.instance_id.toString())
                  return true;
              });
              if (!temp)
                data.push(el);
            });

            data.forEach(el => {
              let objData = {};

              // Details of product and related instances
              const tempProductData = res.find(i => i._id.equals(el.product_id));
              let instances = [];

              if (tempProductData) {
                const tempProductInstanceData = tempProductData.instances.find(i => i._id.equals(el.instance_id));
                const colorId = tempProductInstanceData.product_color_id;

                objData.discount = el.discount;
                objData.product_id = el.product_id;
                objData.instance_id = el.instance_id;
                objData.name = tempProductData.name;
                objData.base_price = tempProductData.base_price;
                objData.size = tempProductInstanceData.size;
                objData.instance_price = tempProductInstanceData.price;
                objData.tags = tempProductData.tags;
                objData.count = tempProductInstanceData.inventory.reduce((a, b) => a.count + b.count);
                const tempColorImage = tempProductData.colors.find(i => i._id && i._id.equals(colorId));
                objData.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                objData.color = tempColorImage ? {
                  id: tempColorImage._id,
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