const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const utils = require('../utils');



describe('POST set delivery agent - External delivery', () => {
    agentObj = {
        aid: null,
        jar: null
    }
    customer = {
        _id: null,
        jar: null,
    }


    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
                first_name: 'Sareh',
                surname: 'Salehi'
            })
            customer._id = customerobj.cid,
                customer.jar = customerobj.jar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    order_lines: {
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: false,
                            status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }
                }
            });
            const orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    customer: {
                        _id: orderData[0].customer_id,
                        address: orderData[0].address
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                order_details: [{
                    order_line_ids: [
                        orderData[0].order_lines[0]._id,
                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orders[0]._id

                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }]
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done()
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('should set delivery ticket as agentset and assing delivery to the user ', async function (done) {
        this.done = done
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
                agentId: agentObj
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/agent'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)

        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.agentSet)
        expect(deliveryData[0].delivery_agent.toString()).toBe(agentObj.aid.toString())


        done()

    });


});


describe('POST request for package - External delivery', () => {
    agentObj = {
        aid: null,
        jar: null
    }
    customer = {
        _id: null,
        jar: null,
    }
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
                first_name: 'Sareh',
                surname: 'Salehi'
            })
            customer._id = customerobj.cid,
                customer.jar = customerobj.jar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    order_lines: {
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: false,
                            status: _const.ORDER_LINE_STATUS.ReadyToDeliver,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
                            desc: null,
                            timestamp: new Date(),
                        }]
                    },
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_STATUS.DeliverySet,
                        desc: null,
                        receiver_id: mongoose.Types.ObjectId(),
                        timestamp: new Date()
                    }]
                }
            });
            const orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    customer: {
                        _id: orderData[0].customer_id,
                        address: orderData[0].address
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                order_details: [{
                    order_line_ids: [
                        orderData[0].order_lines[0]._id,
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
            console.log(err);
        };
    }, 15000);

    it('should set delivery ticket as requestpackage and orderline ticket as finalcheck ', async function (done) {
        this.done = done
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
                agentId: agentObj
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/requestPackage'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const orderData = await models()['OrderTest'].find()
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.requestPackage)
        order = orderData.find(o => o.order_lines)
        expect(order.order_lines[0].tickets[order.order_lines[0].tickets.length-1].status).toBe(_const.ORDER_LINE_STATUS.FinalCheck)
        done()
    });
});

describe('POST start delivery- External delivery', () => {
    agentObj = {
        aid: null,
        jar: null
    }
    customer = {
        _id: null,
        jar: null,
    }
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            const agent = await lib.dbHelpers.addAndLoginAgent('Delivery Agent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
                first_name: 'Sareh',
                surname: 'Salehi'
            })
            customer._id = customerobj.cid,
                customer.jar = customerobj.jar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    order_lines: {
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: false,
                            status: _const.ORDER_LINE_STATUS.Checked,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
                            desc: null,
                            timestamp: new Date(),
                        }]
                    },
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_STATUS.ReadyToDeliver,
                        desc: null,
                        receiver_id: mongoose.Types.ObjectId(),
                        timestamp: new Date()
                    }]
                }
            });
            const orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    customer: {
                        _id: orderData[0].customer_id,
                        address: orderData[0].address
                    }
                },
                from: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                order_details: [{
                    order_line_ids: [
                        orderData[0].order_lines[0]._id,
                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orders[0]._id

                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.requestPackage,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }]
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done()
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('should set delivery ticket as started and order ticket as ondelivery ', async function (done) {
        this.done = done
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
        expect(res.statusCode).toBe(200)
        const orderData = await models()['OrderTest'].find()
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.started)
        order = orderData.find(o => o.order_lines)
        expect(order.tickets[order.tickets.length-1].status).toBe(_const.ORDER_STATUS.OnDelivery)
        done()
    });
});