const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');
const moment = require('moment');



describe('POST Order Ticket Scan-External Delivery', () => {
    let hubClerk = { // central warehosue clerk
        aid: null,
        jar: null,
    };
    let orders, products, deliveries, customer;
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

            const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
            hubClerk.aid = agent.aid;
            hubClerk.jar = agent.rpJar;


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
                },
                { // customer 1: is_guest = true
                    is_guest: true,
                    addresses: [{
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
                    }],
                    active: true,
                    username: "qazaljl@gmail.com",
                    first_name: "qazal",
                    surname: "jl",
                    mobile_no: "09308329772",
                    gender: "m",
                }
            ]);

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
                    status: _const.ORDER_STATUS.ReadyToDeliver,
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
                        status: _const.ORDER_LINE_STATUS.Delivered,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            },
            { // order 2 => a guest customer order
                customer_id: customer[1]._id,
                address: customer[1].addresses[0],
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
                    status: _const.ORDER_STATUS.ReadyToDeliver,
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
                        status: _const.ORDER_LINE_STATUS.Delivered,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }
        
        ]);

            orders = JSON.parse(JSON.stringify(orders));
            // deliveries = await models()['DeliveryTest'].insertMany([{
            //     to: {
            //         customer: {
            //             _id: customer[0].id,
            //             address: customer[0].addresses[0]
            //         }
            //     },
            //     from: {
            //         warehouse_id: warehouses.find(x => x.is_hub)._id

            //     },
            //     order_details: [{
            //         order_line_ids: [
            //             orders[0].order_lines[0]._id
            //         ],
            //         order_id: orders[0]._id
            //     }],
            //     start: new Date(),
            //     tickets: [{
            //         is_processed: false,
            //         status: _const.DELIVERY_STATUS.default,
            //         receiver_id: warehouses[3]._id,
            //         timestamp: new Date()
            //     }],
            //     "__v": 0
            // }]);
            // deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);


    it('should scan product barcode and change its ticket to checked and initiates delivery with logged in customer', async function (done) {
        this.done = done

        const res = await rp({
            jar: hubClerk.jar,
            body: {
                trigger: _const.SCAN_TRIGGER.Inbox,
                orderId: orders[0]._id,
                barcode: '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/ticket/scan'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        const orderData = await models()['OrderTest'].find()
        newOLTicketStatus = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1].status
        expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.Recieved)
        expect(orderData[0].tickets[orderData[0].tickets.length - 1].status).toBe(_const.ORDER_STATUS.DeliverySet)
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.default)
        expect(JSON.stringify(deliveryData[0].order_details[0].order_line_ids[0])).toBe(JSON.stringify(orders[0].order_lines[0]._id))
        done()


    });


    it('should scan product barcode and change its ticket to checked and initiates delivery with guest customer', async function (done) {
        this.done = done

        const res = await rp({
            jar: hubClerk.jar,
            body: {
                trigger: _const.SCAN_TRIGGER.Inbox,
                orderId: orders[0]._id,
                barcode: '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/ticket/scan'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        const orderData = await models()['OrderTest'].find()
        newOLTicketStatus = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1].status
        expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.Recieved)
        expect(orderData[0].tickets[orderData[0].tickets.length - 1].status).toBe(_const.ORDER_STATUS.DeliverySet)
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.default)
        expect(JSON.stringify(deliveryData[0].order_details[0].order_line_ids[0])).toBe(JSON.stringify(orders[0].order_lines[0]._id))
        done()


    });



});