describe('POST Order Ticket Scan - multiple triggers', () => {
    let hubClerk = {
        aid: null,
        jar: null,
    };
    let agentObj = {
        id: null,
        jar: null
    };
    ShopClerk = {
        aid: null,
        jar: null,
    }
    internalagent = {
        aid: null,
        jar: null
    }
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
            const Iagent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
            internalagent.aid = Iagent.aid
            const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
            hubClerk.aid = agent.aid;
            hubClerk.jar = agent.rpJar;
            const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => x.name === 'سانا')._id)
            ShopClerk.aid = sclerck.aid;
            ShopClerk.jar = sclerck.rpJar
            const Dagent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.id = Dagent.aid;
            agentObj.jar = Dagent.rpJar;

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
                addresses: {
                    _id: mongoose.Types.ObjectId(),
                    province: "شمالااااال",
                    city: "شمااالال",
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
                is_guest: true,
                active: true,
                username: "qazaljl@gmail.com",
                first_name: "qazal",
                surname: "jl",
                mobile_no: "09308329772",
                gender: "m",
            }
            ]);

            customer = JSON.parse(JSON.stringify(customer));


            orders = await models()['OrderTest'].insertMany([{ // order 0 => a logged in customer order
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
                }, {
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
            { // order 1=> a guest customer order
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
                    product_instance_id: products[0].instances[1]._id,
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_LINE_STATUS.Delivered,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }, { // order 2 => an Internal final scan
                order_time: new Date(),
                is_cart: false,
                tickets: [{
                    is_processed: false,
                    status: _const.ORDER_STATUS.ReadyToDeliver,
                    desc: null,
                    receiver_id: warehouses.find(x => x.name === 'سانا')._id,
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
                        status: _const.ORDER_LINE_STATUS.FinalCheck,
                        receiver_id: warehouses.find(x => x.name === 'سانا')._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            },
            { // order 3 => external final scan
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
                        status: _const.ORDER_LINE_STATUS.FinalCheck,
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
                        status: _const.ORDER_LINE_STATUS.FinalCheck,
                        receiver_id: warehouses.find(x => x.is_hub)._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }, { // order 4 => CC final scan
                address: warehouses.find(x => x.name === 'سانا').address,
                order_time: new Date(),
                is_cart: false,
                is_collect: true,
                tickets: [{
                    is_processed: false,
                    status: _const.ORDER_STATUS.DeliverySet,
                    desc: null,
                    receiver_id: warehouses.find(x => x.name === 'سانا')._id,
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
                        status: _const.ORDER_LINE_STATUS.FinalCheck,
                        receiver_id: warehouses.find(x => x.name === 'سانا')._id,
                        desc: null,
                        timestamp: new Date(),
                    }]
                }]
            }

            ]);

            orders = JSON.parse(JSON.stringify(orders));
            deliveries = await models()['DeliveryTest'].insertMany([{ // delivery 0 => external to customer

                to: {
                    customer: {
                        _id: customer[0]._id,
                        address: customer[0].addresses[0]
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id,

                },
                order_details: [{
                    order_line_ids: [
                        orders[0].order_lines[1]._id
                    ],
                    order_id: orders[0]._id
                }],
                start: new Date(),
                delivery_agent: {
                    _id: agentObj.id
                },
                slot: {
                    lower_bound: 10,
                    upper_bound: 14,
                },
                tickets: [{
                    is_processed: false,
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
                    timestamp: new Date()
                }],
                "__v": 0
            },
            { // delivery 1 => internal delivery to hub
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id

                },
                from: {
                    warehouse_id: warehouses.find(x => x.name === 'سانا')._id

                },
                order_details: [{
                    order_line_ids: [
                        orders[2].order_lines[0]._id
                    ],
                    order_id: orders[0]._id
                }],
                start: new Date(),
                delivery_agent: {
                    _id: internalagent.aid
                },
                tickets: [{
                    is_processed: false,
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }, { // delivery 2 => CC after recieved
                to: {
                    warehouse_id: warehouses.find(x => x.name === 'سانا')._id
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                order_details: [{
                    order_line_ids: [
                        orders[4].order_lines[0]._id
                    ],
                    order_id: orders[4]._id
                }],
                start: new Date(),
                delivery_agent: {
                    _id: internalagent.aid
                },
                tickets: [{
                    is_processed: false,
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses.find(x => x.is_hub)._id,
                    timestamp: new Date()
                }],
                "__v": 0
            },
            ]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('should scan prduct barcode for CC delivery and change ticket from finalcheck to checked ', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: ShopClerk.jar,
                body: {
                    trigger: _const.SCAN_TRIGGER.CCDelivery,
                    orderId: orders[4]._id,
                    barcode: '0394081341'
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/ticket/scan'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const orderData = await models()['OrderTest'].find()
            const order = orderData.find(o => o.is_collect === true)
            expect(order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Checked)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });

});