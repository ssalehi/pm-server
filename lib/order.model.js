const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const ProductModel = require('./product.model');
const models = require('../mongo/models.mongo');
const _const = require('./const.list');
class Order extends Base {

    constructor(test = Order.test) {
        super('Order', test);
        this.OrderModel = this.model;
    }

    /**
     * @param body
     *  product_id: the id of the product
     *  product_instance_id : the id of the product instance
     *  number : the number of product instances we want to add
     * @returns {Promise.<*>}
     */
    addToOrder(user, body) {
        if (!user)
            return Promise.reject(error.noUser);
        if (!body)
            return Promise.reject(error.bodyRequired);

        let pid = body.product_id;
        let piid = body.product_instance_id;
        let n = body.number || 1;

        if (!mongoose.Types.ObjectId.isValid(piid) || !mongoose.Types.ObjectId.isValid(pid))
            return Promise.reject(error.invalidId);

        // TODO: should check if we have more than 'n' number of product instance in our inventory

        let newOrderLines = [];
        for (let i = 0; i < n; i++) {
            newOrderLines.push({
                product_id: pid,
                product_instance_id: piid
            });
        }

        return this.OrderModel.update({
            customer_id: user.id,
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
    }


    /**
     * @param body
     *  product_instance_id : the id of the product instance
     *  number : the number of product instances we want to remove
     * @returns {Promise.<*>}
     */
    removeFromOrder(user, body) {
        if (!user)
            return Promise.reject(error.noUser);
        if (!body)
            return Promise.reject(error.bodyRequired);

        let piid = body.product_instance_id;
        let n = body.number || -1;

        if (!mongoose.Types.ObjectId.isValid(piid))
            return Promise.reject(error.invalidId);

        if (n === -1 || n === null) {
            return this.OrderModel.update({
                customer_id: user.id,
                is_cart: true
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
                    $match: {customer_id: mongoose.Types.ObjectId(user.id), is_cart: true}
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
                        customer_id: user.id,
                        is_cart: true,
                    }, {
                        $pull: {
                            'order_line_ids': {
                                _id: {$in: ids}
                            }
                        }
                    })
                });
        }
    }

    getCartItems(user, body) {
        if (!user && (!body || !body.data))
            return Promise.reject(error.instanceDataRequired);

        let overallDetails = null;

        return new Promise((resolve, reject) => {
            // Check user is logged in or not
            // If user is logged in get instance_ids of order-line
            if (user) {
                this.getCustomerOrderDetails(user.id)
                    .then(res => {
                        overallDetails = res;
                        return (new ProductModel(Order.test)).getProducts(Array.from(new Set(res.map(el => mongoose.Types.ObjectId(el.product_id)))), null, null);
                    })
                    .then(res => {
                        if (!res || res.length <= 0)
                            overallDetails = [];

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
                                el.count = tempCurrentInstance.inventory.length > 0 ? tempCurrentInstance.inventory.map(i => i.count).reduce((a, b) => a + b) : 0;

                                const tempColorImage = tempCurrentProduct.colors.find(i => i._id && i._id.equals(colorId));
                                el.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                                el.color = tempColorImage ? {
                                    id: tempColorImage._id,
                                    color_id: tempColorImage.color_id,
                                    name: tempColorImage.name,
                                } : {};

                                tempCurrentProduct.instances.forEach(item => {
                                    if (item.product_color_id.equals(colorId))
                                        instances.push({
                                            instance_id: item._id,
                                            size: item.size,
                                            price: item.price,
                                            quantity: item.inventory.length > 0 ? item.inventory.map(i => i.count).reduce((a, b) => a + b) : 0,
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
                (new ProductModel(Order.test)).getProducts(Array.from(new Set(body.data.map(el => mongoose.Types.ObjectId(el.product_id)))), null, null)
                    .then(res => {
                        let resultData = [];

                        //Remove duplicate data
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

                                objData.discount = tempProductData.discount;
                                objData.product_id = el.product_id;
                                objData.instance_id = el.instance_id;
                                objData.name = tempProductData.name;
                                objData.base_price = tempProductData.base_price;
                                objData.size = tempProductInstanceData.size;
                                objData.instance_price = tempProductInstanceData.price;
                                objData.tags = tempProductData.tags;
                                objData.count = tempProductInstanceData.inventory.length > 0 ? tempProductInstanceData.inventory.map(i => i.count).reduce((a, b) => a + b) : 0;
                                const tempColorImage = tempProductData.colors.find(i => i._id && i._id.equals(colorId));
                                objData.thumbnail = tempColorImage ? tempColorImage.image.thumbnail : null;

                                objData.color = tempColorImage ? {
                                    id: tempColorImage._id,
                                    color_id: tempColorImage.color_id,
                                    name: tempColorImage.name
                                } : {};

                                tempProductData.instances.forEach(item => {
                                    if (item.product_color_id.equals(colorId))
                                        instances.push({
                                            instance_id: item._id,
                                            size: item.size,
                                            price: item.price,
                                            quantity: item.inventory.map(i => i.count).reduce((a, b) => a + b),
                                        });
                                });

                                objData.instances = instances;
                            }

                            // Set quantity for product's instance
                            objData.quantity = body.data.filter(i => {
                                if (i &&
                                    i.product_id && el.product_id && i.product_id.toString() === el.product_id.toString()
                                    && i.instance_id && el.instance_id && i.instance_id.toString() === el.instance_id.toString())
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

    getCustomerOrderDetails(user_id) {
        return this.OrderModel.aggregate([
            {
                $match: {customer_id: mongoose.Types.ObjectId(user_id), address_id: {$exists: false}, is_cart: true}
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
                    transaction_id: {$first: '$transaction_id'}
                }
            }
        ])
    }

    checkCouponValidation(user, body) {
        if (!user)
            return Promise.reject(error.noUser);

        if (!body.product_ids || body.product_ids.length <= 0)
            return Promise.reject(error.productIdRequired);

        if (!body.coupon_code)
            return Promise.reject(error.noCouponCode);

        return new Promise((resolve, reject) => {
            this.getCustomerOrderDetails(user.id)
                .then(res => {
                    res = res.filter(el => body.product_ids.includes(el.product_id.toString()) && !el.transaction_id);

                    if (res.length > 0)
                        return (new ProductModel(Order.test)).getProductCoupon(res.map(el => mongoose.Types.ObjectId(el.product_id)), body.coupon_code);
                    else
                        return Promise.reject(error.invalidExpiredCouponCode);
                })
                .then(res => {
                    if (!res || res.length <= 0)
                        return Promise.reject(error.invalidExpiredCouponCode);

                    resolve(res);
                })
                .catch(err => {
                    console.error('An error occurred in checkCouponValidation function: ', err);
                    reject(err);
                })
        });
    }

    applyCouponCode(user, body) {
        if (!user)
            return Promise.reject(error.noUser);

        if (!body.coupon_code || body.coupon_code.length <= 0)
            return Promise.reject(error.noCouponCode);

        return this.OrderModel.update({
            customer_id: mongoose.Types.ObjectId(user.id),
            address_id: {$exists: false},
            is_cart: true
        }, {
            coupon_code: body.coupon_code,
        }, {
            upsert: true
        });
    }

    setTicket(body) {
        if (!body.order_id)
            return Promise.reject(error.OrderIdNotFound);
           if(!Object.values(_const.STATUS_ORDER).some(x => x=== body.status))
               return Promise.reject(error.StatusIsNotValid);
           return this.OrderModel.update({
            '_id': body.order_id,
            'address_id': {$ne: null},
            'transaction_id': {$ne: null},
            'is_cart': false,
        }, {
            $addToSet: {
              tickets: {
                warehouse_id: body.warehouse_id,
                status: body.status,
                desc: body.desc,
                is_processed: false
              }
            }
        })
    }
}

Order.test = false;
module.exports = Order;