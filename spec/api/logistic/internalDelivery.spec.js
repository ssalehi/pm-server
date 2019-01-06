const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');



describe('delivery start', () => {

    let orders, products, deliveries;
    let agentObj = {
        aid: null,
        jar: null
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
            const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)


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

            orders = await models()['OrderTest'].insertMany([{
                order_time: new Date(),
                is_cart: false,
                transaction_id: 'xyz45300',
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.ORDER_LINE_STATUS.DeliverySet,
                    desc: null,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }],
                order_lines: [{ //orderline which product is checked 
                        product_id: products[0]._id,
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
                    //delivery 0 : from a shop to hub all orderlines checked
                    to: {
                        warehouse_id: warehouses.find(x => x.is_hub)._id
                    },
                    from: {
                        warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
                    },
                    is_return: false,
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
                }, { //delivery 1 : from a shop to hub with unchecked ordelines whose ticket is set to verrified
                    to: {
                        warehouse_id: warehouses.find(x => x.is_hub)._id
                    },
                    from: {
                        warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
                    },
                    is_return: false,
                    order_details: [{
                        order_line_ids: [
                            orders[0].order_lines[0]._id,
                            orders[0].order_lines[1]._id
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
                { //delivery 2 :  cc from a shop to another shop
                    to: {
                        warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
                    },
                    from: {
                        warehouse_id: warehouses.find(x => x.is_hub)._id
                    },
                    is_return: false,
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
            ])
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
        done()

    });

    it('should start a delivery with one orderline ready and one on finalcheck from shop to hub', async function (done) {
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
        expect(lastTicket2.status).toBe(_const.ORDER_LINE_STATUS.OnlineWarehouseVerified)
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[1].order_details.length).toBe(1)
        done()
    });
    it('should start a delivery with one orderline ready and one on finalcheck from hub to shop ', async function (done) {
        this.done = done;

        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[2]._id,
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
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[1].order_details.length).toBe(1)
        done()

    });


});