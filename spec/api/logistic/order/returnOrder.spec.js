const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const utils = require('../utils');



describe('POST Order request return', () => {
    let orders, products;
    customer = {
        _id: null,
        jar: null,
    }
    salesmanager = {
        aid: null,
        jar: null
    }


    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            centralW = warehouses.find(x => !x.is_hub && !x.has_customer_pickup);
            const sm = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, centralW._id)
            salesmanager.aid = sm.aid
            salesmanager.jar = sm.rpJar;
            const customerobj = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer._id = customerobj.cid;
            customer.jar = customerobj.rpJar;
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_STATUS.Delivered,
                        desc: null,
                        receiver_id: mongoose.Types.ObjectId(),
                        timestamp: new Date()
                    }],
                    order_lines: [{
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: true,
                            status: _const.ORDER_LINE_STATUS.Checked,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }]
                }
            });

            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[1]._id),
            }, {
                $set: {
                    tickets: [{
                        is_processed: false,
                        status: _const.ORDER_STATUS.Delivered,
                        desc: null,
                        receiver_id: mongoose.Types.ObjectId(),
                        timestamp: new Date()
                    }],
                    order_lines: [{
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: true,
                            status: _const.ORDER_LINE_STATUS.Checked,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }, {
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: true,
                            status: _const.ORDER_LINE_STATUS.Checked,
                            receiver_id: mongoose.Types.ObjectId(warehouses.find(x => x.is_hub)._id),
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }]
                }
            });
            orderData = await models()['OrderTest'].find()
            done()
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('should check when customer wants to return an orderline its ticket is set to request cancel', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: customer.jar,
                body: {
                    orderId: orders[0]._id,
                    orderLineId: orderData[0].order_lines[0]._id,
                    addressId: orderData[0].address._id
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/return'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const NorderData = await models()['OrderTest'].find()
            const NorderlineTicket = NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status
            expect(NorderlineTicket).toBe(_const.ORDER_LINE_STATUS.ReturnRequested)
            const smmessage = await models()['SMMessageTest'].find()
            expect(smmessage.length).toBe(NorderData[0].order_lines.length)
            expect(smmessage[0].type).toBe(_const.SM_MESSAGE.ReturnRequest)

            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });


    it('should check when customer wants to return an order all ordeline tickets are set to request cancel', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: customer.jar,
                body: {
                    orderId: orders[1]._id,
                    addressId: orderData[1].address._id
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/return'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const NorderData = await models()['OrderTest'].find()
            for (let i = 0; i < NorderData[1].order_lines.length; i++) {
                const NorderlineTicket = NorderData[1].order_lines[i].tickets[NorderData[1].order_lines[i].tickets.length - 1].status
                expect(NorderlineTicket).toBe(_const.ORDER_LINE_STATUS.ReturnRequested)
            }
            const smmessage = await models()['SMMessageTest'].find()
            expect(smmessage.length).toBe(NorderData[1].order_lines.length)
            for (let i = 0; i < smmessage.length; i++) {
                expect(smmessage[i].type).toBe(_const.SM_MESSAGE.ReturnRequest)
            }

            done()

        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
});