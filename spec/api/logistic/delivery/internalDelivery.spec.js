const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const utils = require('../utils');


describe('Requset For Package-Internal Delivery', () => {
    let orders, products, deliveries;
    let agentObj = {
        id: null,
        jar: null
    };
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.id = agent.aid;
            agentObj.jar = agent.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)
            products = await utils.makeProducts();

            orders = await models()['OrderTest'].insertMany([{
                order_time: new Date(),
                is_cart: false,
                transaction_id: 'xyz45300',
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.ORDER_STATUS.DeliverySet,
                    desc: null,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }],
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
                        status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
                        desc: null,
                        receiver_id: agentObj.aid,
                        timestamp: new Date()
                    }]

                }, {
                    product_id: products[0],
                    campaign_info: {
                        _id: mongoose.Types.ObjectId(),
                        discount_ref: 0
                    },
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        is_processed: false,
                        _id: mongoose.Types.ObjectId(),
                        status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
                        desc: null,
                        receiver_id: agentObj.aid,
                        timestamp: new Date()
                    }]
                }]
            }]);
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                from: {
                    warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
                },
                order_details: [{
                    order_line_ids: [
                        orders[0].order_lines[0]._id,
                        orders[0].order_lines[1]._id,

                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orders[0]._id

                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.agentSet,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }]
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done()
        } catch (err) {
            console.log(err)
        };
    }, 15000);
    it('should change orderlines ticket to finalcheck and delivery ticket to request for package', async function (done) {
        this.done = done;
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
                user: agentObj,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/requestPackage'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200);
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.requestPackage)
        const orderData = await models()['OrderTest'].find()
        orderData[0].order_lines.forEach(orderline => {
            expect(orderline.tickets[orderline.tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.FinalCheck)
        });
        done();
    });
});

describe('Delivery Start-Internal Delivery', () => {

    let orders, products, deliveries;
    let agentObj = {
        aid: null,
        jar: null
    };

    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)
            products = await utils.makeProducts();


            orders = await models()['OrderTest'].insertMany([{
                order_time: new Date(),
                is_cart: false,
                transaction_id: 'xyz45300',
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.ORDER_STATUS.DeliverySet,
                    desc: null,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }],
                order_lines: [{ //orderline which product is checked 
                        product_id: products[0]._id,
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: products[0].instances[0]._id,
                        tickets: [{
                            is_processed: false,
                            _id: mongoose.Types.ObjectId(),
                            status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
                            desc: null,
                            receiver_id: agentObj.aid,
                            timestamp: new Date()
                        }]

                    },
                    { //orderline which product has final check ticket status 
                        product_id: products[0],
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: products[0].instances[0]._id,
                        tickets: [{
                            is_processed: false,
                            _id: mongoose.Types.ObjectId(),
                            status: _const.ORDER_LINE_STATUS.FinalCheck,
                            desc: null,
                            receiver_id: agentObj.aid,
                            timestamp: new Date()
                        }]
                    }
                ]
            }]);

            orders = JSON.parse(JSON.stringify(orders));
            deliveries = await models()['DeliveryTest'].insertMany([{
                    //delivery 0 : from a shop to hub
                    to: {
                        warehouse_id: warehouses.find(x => x.is_hub)._id
                    },
                    from: {
                        warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
                    },
                    order_details: [{
                        order_line_ids: [
                            orders[0].order_lines[0]._id,
                        ],
                        _id: mongoose.Types.ObjectId(),
                        order_id: orders[0]._id

                    }],
                    start: new Date(),
                    tickets: [{
                        is_processed: false,
                        _id: mongoose.Types.ObjectId(),
                        status: _const.DELIVERY_STATUS.agentSet,
                        receiver_id: agentObj.aid,
                        timestamp: new Date()
                    }]
                },
                { //delivery 1:  from hub to  shop
                    to: {
                        warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
                    },
                    from: {
                        warehouse_id: warehouses.find(x => x.is_hub)._id
                    },

                    order_details: [{
                        order_line_ids: [
                            orders[0].order_lines[1]._id,
                            orders[0].order_lines[0]._id
                        ],
                        _id: mongoose.Types.ObjectId(),
                        order_id: orders[0]._id
                    }],
                    start: new Date(),
                    tickets: [{
                        is_processed: false,
                        _id: mongoose.Types.ObjectId(),
                        status: _const.DELIVERY_STATUS.agentSet,
                        receiver_id: warehouses[0]._id,
                        timestamp: new Date()
                    }]
                },
            ]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);


    it('should start a delivery with all products checked from shop to hub', async function (done) {
        this.done = done;

        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
                preCheck: false,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/start'),
            resolveWithFullResponse: true
        });

        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.started)
        const orderData = await models()['OrderTest'].find()
        lastTicket = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1]
        expect(lastTicket.status).toBe(_const.ORDER_LINE_STATUS.OnDelivery)
        expect(res.statusCode).toBe(200)
        expect(deliveryData[0].order_details[0].order_line_ids.length).toBe(1)
        isExist = deliveryData[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orders[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        done()

    });

    it('should start a delivery with one orderline ready and one on finalcheck from shop to hub => the left one should be put back on prev state in shop', async function (done) {
        this.done = done;
        const deliveryData1 = await models()['DeliveryTest'].find()
        deliveryData1[0].order_details[0].order_line_ids = [orders[0].order_lines[0]._id, orders[0].order_lines[1]._id]
        await deliveryData1[0].save()
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
                preCheck: false,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/start'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)

        const orderData = await models()['OrderTest'].find()
        lastTicket = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1]
        expect(lastTicket.status).toBe(_const.ORDER_LINE_STATUS.OnDelivery)
        lastTicket2 = orderData[0].order_lines[1].tickets[orderData[0].order_lines[1].tickets.length - 1]
        expect(lastTicket2.status).toBe(_const.ORDER_LINE_STATUS.OnlineWarehouseVerified)
        const deliveryData = await models()['DeliveryTest'].find()
        isExist = deliveryData[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orders[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        done()
    });
    it('should start a delivery with one orderline ready and one on finalcheck from hub to shop => => the left one should be put back on prev state on hub', async function (done) {
        this.done = done;

        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[1]._id,
                preCheck: false,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/start'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const orderData = await models()['OrderTest'].find()
        lastTicket = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1]
        expect(lastTicket.status).toBe(_const.ORDER_LINE_STATUS.OnDelivery)
        lastTicket2 = orderData[0].order_lines[1].tickets[orderData[0].order_lines[1].tickets.length - 1]
        expect(lastTicket2.status).toBe(_const.ORDER_LINE_STATUS.Delivered)
        expect(lastTicket2.receiver_id.toString()).toBe(warehouses.find(x => x.is_hub)._id.toString())
        const deliveryData = await models()['DeliveryTest'].find()
        isExist = deliveryData[1].order_details[0].order_line_ids.map(id => id.toString()).includes(orders[0].order_lines[0]._id.toString())
        expect(deliveryData[1].order_details.length).toBe(1)
        expect(isExist).toBe(true)
        done()
    });
});

