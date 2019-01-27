const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');
const moment = require('moment');


describe('Post assign agent to delivery-ExternalDelivery', () => {
    let orders, products, deliveries;
    let agentObj = {
        aid: null,
        jar: null
    };
    let hubclerk = {
        hid: null,
        jar: null
    }
    let colorIds = [
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId()
    ];
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            hub = warehouses.find(x => x.is_hub);
            const hclerk = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
            hubclerk.hid = hclerk.aid;
            hubclerk.jar = hclerk.rpJar;
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar
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
                }]

            }]);
            products = JSON.parse(JSON.stringify(products));
            customer = await models()['CustomerTest'].insertMany([{ // customer 0 : is_guest = false
                id: mongoose.Types.ObjectId(),
                is_guest: false,
                addresses: {
                    _id: mongoose.Types.ObjectId(),
                    province: "تهران",
                    city: "تهران",
                    street: "دوم شرقی",
                    unit: "6",
                    no: "4",
                    district: "چاردیواری",
                    recipient_title: "m",
                    recipient_name: "احسان",
                    recipient_surname: "انصاری بصیر",
                    recipient_national_id: "0010684281",
                    recipient_mobile_no: "09125975886",
                    postal_code: "9",
                    loc: {
                        long: 51.379926,
                        lat: 35.696491
                    }
                },
                active: true,
                username: "qazaljal@gmail.com",
                first_name: "qazal",
                surname: "jl",
                mobile_no: "09308329772",
                gender: "m",
            }]);
            customer = JSON.parse(JSON.stringify(customer));
            orders = await models()['OrderTest'].insertMany([{ // order 1 => a logged in customer order
                customer_id: customer[0]._id,
                address: customer[0].addresses[0],
                order_time: new Date(),
                delivery_info: {
                    duration_days: 3,
                    delivery_cost: 63000,
                    delivery_discount: 0,
                    delivery_expire_day: new Date(),
                    time_slot: {
                        lower_bound: 10,
                        upper_bound: 14,
                    }
                },
                is_cart: false,
                tickets: [{
                    is_processed: false,
                    status: _const.ORDER_STATUS.DeliverySet,
                    desc: null,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
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
                        status: _const.ORDER_LINE_STATUS.Recieved,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }, {
                    product_id: products[0]._id,
                    campaign_info: {
                        _id: mongoose.Types.ObjectId(),
                        discount_ref: 0
                    },
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_LINE_STATUS.Recieved,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }]);
            orders = JSON.parse(JSON.stringify(orders));
            deliveries = await models()['DeliveryTest'].insertMany([{

                to: {
                    customer: {
                        _id: customer[0]._id,
                        address: customer[0].addresses[0]
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id

                },
                order_details: [{
                    order_line_ids: [
                        orders[0].order_lines[0]._id,
                        orders[0].order_lines[1]._id
                    ],
                    order_id: orders[0]._id
                }],
                start: new Date(),
                slot: {
                    lower_bound: 10,
                    upper_bound: 14
                },
                tickets: [{
                    is_processed: false,
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err)};
    }, 15000);

    it('should', async function (done) {
        this.done = done

        const res = await rp({
            jar: hubclerk.jar,
            body: {
                deliveryId: deliveries[0]._id,
                agentId: agentObj.aid
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/agent'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.agentSet)
        done()

    });

});
///////////////////////////////////////////////////////////////////////////////////////////////
describe('Post Request for Package-ExternalDelivery', () => {
    let orders, products, deliveries;
    let agentObj = {
        aid: null,
        jar: null
    };
    let hubclerk = {
        hid: null,
        jar: null
    }
    let colorIds = [
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId(),
        mongoose.Types.ObjectId()
    ];
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            hub = warehouses.find(x => x.is_hub);
            const hclerk = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
            hubclerk.hid = hclerk.aid;
            hubclerk.jar = hclerk.rpJar;
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar
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
                }]

            }]);
            products = JSON.parse(JSON.stringify(products));
            customer = await models()['CustomerTest'].insertMany([{ // customer 0 : is_guest = false
                id: mongoose.Types.ObjectId(),
                is_guest: false,
                addresses: {
                    _id: mongoose.Types.ObjectId(),
                    province: "تهران",
                    city: "تهران",
                    street: "دوم شرقی",
                    unit: "6",
                    no: "4",
                    district: "چاردیواری",
                    recipient_title: "m",
                    recipient_name: "احسان",
                    recipient_surname: "انصاری بصیر",
                    recipient_national_id: "0010684281",
                    recipient_mobile_no: "09125975886",
                    postal_code: "9",
                    loc: {
                        long: 51.379926,
                        lat: 35.696491
                    }
                },
                active: true,
                username: "qazaljal@gmail.com",
                first_name: "qazal",
                surname: "jl",
                mobile_no: "09308329772",
                gender: "m",
            }]);
            customer = JSON.parse(JSON.stringify(customer));
            orders = await models()['OrderTest'].insertMany([{ // order 1 => a logged in customer order
                customer_id: customer[0]._id,
                address: customer[0].addresses[0],
                order_time: new Date(),
                delivery_info: {
                    duration_days: 3,
                    delivery_cost: 63000,
                    delivery_discount: 0,
                    delivery_expire_day: new Date(),
                    time_slot: {
                        lower_bound: 10,
                        upper_bound: 14,
                    }
                },
                is_cart: false,
                tickets: [{
                    is_processed: false,
                    status: _const.ORDER_STATUS.DeliverySet,
                    desc: null,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
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
                        status: _const.ORDER_LINE_STATUS.Recieved,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }, {
                    product_id: products[0]._id,
                    campaign_info: {
                        _id: mongoose.Types.ObjectId(),
                        discount_ref: 0
                    },
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_LINE_STATUS.Recieved,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }]);
            orders = JSON.parse(JSON.stringify(orders));
            deliveries = await models()['DeliveryTest'].insertMany([{

                to: {
                    customer: {
                        _id: customer[0]._id,
                        address: customer[0].addresses[0]
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id

                },
                order_details: [{
                    order_line_ids: [
                        orders[0].order_lines[0]._id,
                        orders[0].order_lines[1]._id
                    ],
                    order_id: orders[0]._id
                }],
                start: new Date(),
                slot: {
                    lower_bound: 10,
                    upper_bound: 14
                },
                tickets: [{
                    is_processed: false,
                    status: _const.DELIVERY_STATUS.agentSet,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err)};
    }, 15000);
    it('should change orderlines ticket to finalcheck and delivery ticket to request for package', async function (done) {
        this.done = done;
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
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
/////////////////////////////////////////////////////////////////////////////


describe('Post start delivery-ExternalDelivery', () => {
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
            await models()['WarehouseTest'].insertMany(warehouses)
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar
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
                }]

            }]);
            products = JSON.parse(JSON.stringify(products));
            customer = await models()['CustomerTest'].insertMany([{ // customer 0 : is_guest = false
                id: mongoose.Types.ObjectId(),
                is_guest: false,
                addresses: {
                    _id: mongoose.Types.ObjectId(),
                    province: "تهران",
                    city: "تهران",
                    street: "دوم شرقی",
                    unit: "6",
                    no: "4",
                    district: "چاردیواری",
                    recipient_title: "m",
                    recipient_name: "احسان",
                    recipient_surname: "انصاری بصیر",
                    recipient_national_id: "0010684281",
                    recipient_mobile_no: "09125975886",
                    postal_code: "9",
                    loc: {
                        long: 51.379926,
                        lat: 35.696491
                    }
                },
                active: true,
                username: "qazaljal@gmail.com",
                first_name: "qazal",
                surname: "jl",
                mobile_no: "09308329772",
                gender: "m",
            }]);
            customer = JSON.parse(JSON.stringify(customer));
            orders = await models()['OrderTest'].insertMany([{
                customer_id: customer[0]._id,
                address: customer[0].addresses[0],
                order_time: new Date(),
                agent_id : agentObj.aid,
                delivery_info: {
                    duration_days: 3,
                    delivery_cost: 63000,
                    delivery_discount: 0,
                    delivery_expire_day: new Date(),
                    time_slot: {
                        lower_bound: 10,
                        upper_bound: 14,
                    }
                },
                is_cart: false,
                tickets: [{
                    is_processed: false,
                    status: _const.ORDER_STATUS.ReadyToDeliver,
                    desc: null,
                    receiver_id: customer[0]._id,
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
                        status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
                        receiver_id: customer[0]._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }, {
                    product_id: products[0]._id,
                    campaign_info: {
                        _id: mongoose.Types.ObjectId(),
                        discount_ref: 0
                    },
                    product_instance_id: products[0].instances[0]._id,
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
                        receiver_id: customer[0]._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }]);
            orders = JSON.parse(JSON.stringify(orders));
            deliveries = await models()['DeliveryTest'].insertMany([{

                to: {
                    customer: {
                        _id: customer[0]._id,
                        address: customer[0].addresses[0]
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id

                },
                order_details: [{
                    order_line_ids: [
                        orders[0].order_lines[0]._id,
                        orders[0].order_lines[1]._id
                    ],
                    order_id: orders[0]._id
                }],
                start: new Date(),
                slot: {
                    lower_bound: 10,
                    upper_bound: 14
                },
                tickets: [{
                    is_processed: false,
                    status: _const.DELIVERY_STATUS.requestPackage,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err)};
    }, 15000);


    it('should change orderlines ticket to finalcheck and delivery ticket to request for package', async function (done) {
        this.done = done;
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/start'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200);
        done();
    });

});