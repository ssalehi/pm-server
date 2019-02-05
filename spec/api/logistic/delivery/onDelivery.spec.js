const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const utils = require('../utils');


describe('POST End Delivery ', () => {

    let orders, products, deliveries;
    let agentObj = {
        id: null,
        jar: null
    };

    customer = {
        _id: null,
        jar: null,
    }

    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            const agent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
            agentObj.id = agent.aid;
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
                        tickets: []
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
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[1]._id),
            }, {
                $set: {
                    order_lines: {
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: []
                    },
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_STATUS.OnDelivery,
                        desc: null,
                        receiver_id: mongoose.Types.ObjectId(),
                        timestamp: new Date()
                    }]
                }
            });
            const orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    customer:{
                        _id: orderData[1].customer_id,
                        address: orderData[1].address
                    }
                },
                from: {
                    warehouse_id:  warehouses.find(x => x.is_hub)._id
                },
                order_details: [{
                    order_line_ids: [
                        orderData[1].order_lines[0]._id,
                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orderData[1]._id

                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    _id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.started,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }]
            },{
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                from: {
                    warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
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
                    status: _const.DELIVERY_STATUS.started,
                    receiver_id: agentObj.aid,
                    timestamp: new Date()
                }]
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('should end internal delivery ', async function (done) {
        this.done = done;
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[1]._id,
                user: agentObj
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/end'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        const orderData = await models()['OrderTest'].find()
        deliveryTicketStatus = deliveryData[1].tickets[deliveryData[1].tickets.length - 1].status
        expect(deliveryTicketStatus).toBe(_const.DELIVERY_STATUS.ended)
        orderData[0].order_lines.forEach(orderline => {
            expect(orderline.tickets[orderline.tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Delivered)
        });
        done()
    });

    it('should end external delivery ', async function (done) {
        this.done = done;
        const res = await rp({
            jar: agentObj.jar,
            body: {
                deliveryId: deliveries[0]._id,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('delivery/end'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        const orderData = await models()['OrderTest'].find()
        deliveryTicketStatus = deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status
        expect(deliveryTicketStatus).toBe(_const.DELIVERY_STATUS.ended)
        expect(orderData[1].tickets[orderData[1].tickets.length-1].status).toBe(_const.ORDER_STATUS.Delivered)
        done()
    });
});