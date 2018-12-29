const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses')


describe('Inbox way to go', () => {
    let adminObj = {
        aid: null,
        jar: null,
    };

    let orders, products;
    let customer = {
        cid: null,
        jar: null
    };

    let customerAddress = {
        _id: mongoose.Types.ObjectId(),
        province: 'تهران',
        city: 'تهران',
        street: 'مطهری'
    };

    let colorIds = [
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId()
    ];

    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const admin = await lib.dbHelpers.addAndLoginAgent('OfflineSystem', _const.ACCESS_LEVEL.OfflineSystem)
            adminObj.aid = admin.aid;
            adminObj.jar = admin.rpJar;

            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
                address: customerAddress
            });

            customer.cid = res.cid;
            customer.jar = res.rpJar;
            products = await models()['ProductTest'].insertMany([{
                article_no: 'xy123',
                name: 'sample 1',
                product_type: {
                    name: 'sample type',
                    product_type_id: mongoose.Types.ObjectId()
                },
                brand: {
                    name: 'sample brand',
                    brand_id: mongoose.Types.ObjectId()
                },
                base_price: 30000,
                desc: 'some description for this product',
                colors: [{
                        color_id: colorIds[0],
                        name: 'green'
                    },
                    {
                        color_id: colorIds[1],
                        name: 'yellow'
                    },
                    {
                        color_id: colorIds[2],
                        name: 'red'
                    }
                ],
                instances: [{
                        product_color_id: colorIds[0],
                        size: "11",
                        price: 2000,
                        barcode: '0394081341',
                        inventory: [{
                            count: 3,
                            reserved: 1,
                            warehouse_id: warehouses[1]._id
                        }, {
                            count: 2,
                            reserved: 0,
                            warehouse_id: warehouses[2]._id
                        }, {
                            count: 3,
                            reserved: 0,
                            warehouse_id: warehouses[3]._id
                        }, {
                            count: 4,
                            reserved: 0,
                            warehouse_id: warehouses[4]._id
                        }]
                    },
                    {
                        product_color_id: colorIds[1],
                        size: "10",
                        price: 4000,
                        barcode: '19231213123',
                        inventory: [{
                            count: 2,
                            reserved: 2,
                            warehouse_id: warehouses[1]._id
                        }, {
                            count: 1,
                            reserved: 0,
                            warehouse_id: warehouses[2]._id
                        }, {
                            count: 4,
                            reserved: 0,
                            warehouse_id: warehouses[3]._id
                        }, {
                            count: 5,
                            reserved: 0,
                            warehouse_id: warehouses[4]._id
                        }]
                    }
                ]
            }]);

            products = JSON.parse(JSON.stringify(products));

            orders = await models()['OrderTest'].insertMany([{ // order 1 => a normal order which central warehosue has inventory for
                customer_id: customer.cid,
                order_time: '2018-12-24T20:14:20.462z',
                is_cart: false,
                order_lines: [{
                    product_id: products[0]._id,
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        "is_processed": false,
                        "_id": mongoose.Types.ObjectId(),
                        "status": 2,
                        "desc": null,
                        "timestamp": '2018-12-24T20:14:20.462z'
                    }]
                }, {
                    product_id: products[0],
                    product_instance_id: products[0].instances[0]._id,
                    tickets: []
                }]
            },
            { // order 1 => a normal order which central warehosue has inventory for
                customer_id: customer.cid,
                order_time: '2018-12-30T20:14:20.462z',
                is_cart: false,
                order_lines: [{
                    product_id: products[0]._id,
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        "is_processed": false,
                        "_id": mongoose.Types.ObjectId(),
                        "status": 2,
                        "desc": null,
                        "timestamp": '2018-12-30T20:14:20.462z'
                    }]
                }, {
                    product_id: products[0],
                    product_instance_id: products[0].instances[0]._id,
                    tickets: []
                }]
            }
        ]);

            orders = JSON.parse(JSON.stringify(orders));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('should check the order&delivery details to be correct ', async function (done) {
        this.done = done
        const res = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orders[0].order_lines[0]._id,
                "warehouseId": warehouses[1]._id,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/verifyOnlineWarehouse'),
            resolveWithFullResponse: true
        })
        //order details expectations
        expect(res.statusCode).toBe(200)
        const res1 = await models()['OrderTest'].find()
        let lastTicket = res1[0].order_lines[0].tickets[res1[0].order_lines[0].tickets.length - 1].status;
        expect(lastTicket).toBe(_const.ORDER_LINE_STATUS.DeliverySet)
        
        
        
        // delivery details expectations
          const deliveries = await models()['DeliveryTest'].find()
          expect(deliveries[0].tickets[0].status).toBe(_const.DELIVERY_STATUS.default)

       
        const res2 = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[1]._id,
                "orderLineId": orders[1].order_lines[0]._id,
                "warehouseId": warehouses[1]._id,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '19231213123'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/verifyOnlineWarehouse'),
            resolveWithFullResponse: true
        })
        expect(res2.statusCode).toBe(200)
        console.log('->',new Date());
        done();
    });

});