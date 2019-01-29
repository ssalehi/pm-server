const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');
const moment = require('moment');

describe('POST onlineWarehouseResponse', () => {
    let adminObj = {
        aid: null,
        jar: null,
    };

    let agentObj = {
        aid: null,
        jar: null,
    };

    let orders, products, deliveries;
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
            const agent = await lib.dbHelpers.addAndLoginAgent('DeliveryAgent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
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
                            reserved: 2,
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
                            count: 0,
                            reserved: 0,
                            warehouse_id: warehouses[1]._id
                        }, {
                            count: 0,
                            reserved: 0,
                            warehouse_id: warehouses[2]._id
                        }, {
                            count: 0,
                            reserved: 0,
                            warehouse_id: warehouses[3]._id
                        }, {
                            count: 0,
                            reserved: 0,
                            warehouse_id: warehouses[4]._id
                        }]
                    }
                ]
            }]);

            products = JSON.parse(JSON.stringify(products));
            orders = await models()['OrderTest'].insertMany([{ // order 1 => a normal order which central warehosue has inventory for
                customer_id: customer.cid,
                order_time: new Date(),
                is_cart: false,
                order_lines: [{
                    product_id: products[0]._id,
                    campaign_info: {
                        _id: mongoose.Types.ObjectId(),
                        discount_ref: 0
                    },
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        is_processed: false,
                        _id: mongoose.Types.ObjectId(),
                        status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }, {
                    product_id: products[0],
                    campaign_info: {
                        _id: mongoose.Types.ObjectId(),
                        discount_ref: 0
                    },
                    product_instance_id: products[0].instances[1]._id,
                    tickets: [{
                        is_processed: false,
                        _id: mongoose.Types.ObjectId(),
                        status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }]);

            orders = JSON.parse(JSON.stringify(orders));

            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                from: {
                    warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id

                },
                order_details: [{
                    order_line_ids: [
                        orders[0].order_lines[1]._id,
                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orders[0]._id
                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses[3]._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('new delivery created and orderline ticket is changed to deliveryset', async function (done) {
        this.done = done;
        await models()['DeliveryTest'].deleteMany({});
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
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveries = await models()['DeliveryTest'].find();
        expect(deliveries.length).toBe(1)
        const res1 = await models()['OrderTest'].find()
        let lastTicket = res1[0].order_lines[0].tickets[res1[0].order_lines[0].tickets.length - 1].status;
        expect(lastTicket).toBe(_const.ORDER_LINE_STATUS.DeliverySet)
        done()
    });
    it('should check the orderline is added to an existing delivery that is being started today ', async function (done) {
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
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData.length).toBe(1)
        isExist = deliveryData[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orders[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        expect(deliveryData[0].to.warehouse_id.toString()).toBe(warehouses.find(x => x.is_hub)._id.toString())
        done()
    });
    it('should add the delivery to an existing one that has started few days ago', async function (done) {
        this.done = done;
        const deliveryData = await models()['DeliveryTest'].find()
        deliveryData[0].start = (new Date()).setDate(new Date().getDate() - 3);
        await deliveryData[0].save()
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
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        const deliveryData1 = await models()['DeliveryTest'].find()
        isExist = deliveryData1[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orders[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        expect(deliveryData1[0].start.getDate()).not.toEqual(new Date().getDate())
        expect(deliveryData1.length).toBe(1)
        done()
    });

    it('should check when the existing delivery is started creates a new delivery for new orderlines', async function (done) {
        this.done = done
        const deliveryData = await models()['DeliveryTest'].find()
        deliveryData[0].tickets[0].status = _const.DELIVERY_STATUS.started
        deliveryData[0].delivery_start = new Date()
        await deliveryData[0].save()
        const addDelivery = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orders[0].order_lines[1]._id,
                "warehouseId": warehouses[1]._id,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(addDelivery.statusCode).toBe(200)
        const deliveryData2 = await models()['DeliveryTest'].find()
        expect(deliveryData2.length).toBe(2)
        newDelivery = deliveryData2.find(delivery => delivery.tickets[0].status === _const.DELIVERY_STATUS.default)
        let nextDay = moment(moment().add('d', 1)).format('YYYY-MM-DD');
        expect(moment(newDelivery.start).format('YYYY-MM-DD')).toBe(nextDay)
        done()
    });
    it('should check after onlinewarehouseverification the reserved and count of an inventory are reduced by 1', async function (done) {
        this.done = done
        const addDelivery = await rp({
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
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        expect(addDelivery.statusCode).toBe(200)
        const productsData = await models()['ProductTest'].find()
        NewCount = productsData[0].instances[0].inventory.find(inv => inv.warehouse_id = warehouses[1]._id).count
        NewReserved = productsData[0].instances[0].inventory.find(inv => inv.warehouse_id = warehouses[1]._id).reserved
        expect(NewCount).toBe(products[0].instances[0].inventory[0].count - 1)
        expect(NewReserved).toBe(products[0].instances[0].inventory[0].reserved - 1)
        done()
    });
    it('should check if an inventory count and reserved are 0 gets error', async function (done) {

        try {
            this.done = done
            await models()['DeliveryTest'].deleteMany({});
            await rp({
                jar: adminObj.jar,
                body: {
                    "orderId": orders[0]._id,
                    "orderLineId": orders[0].order_lines[1]._id,
                    "warehouseId": warehouses[1]._id,
                    "userId": '5c209119da8a28386c02471b',
                    "barcode": '0394081341'
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
                resolveWithFullResponse: true
            })
            this.fail('expect error when count and reserved amounts are 0')
            done()
        } catch (err) {
            expect(err.statusCode).toBe(500);
            done()
        };
    });

});