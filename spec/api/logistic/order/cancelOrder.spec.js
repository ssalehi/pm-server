const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const utils = require('../utils');


describe('POST Order Cancel', () => {
    let orders, products;
    let hubClerk = {
        aid: null,
        jar: null,
    };
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
            hub = warehouses.find(x => x.is_hub);
            const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
            hubClerk.aid = agent.aid;
            hubClerk.jar = agent.rpJar;
            centralW = warehouses.find(x => !x.is_hub && !x.has_customer_pickup);
            const sm = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, centralW._id)
            salesmanager.aid = sm.aid
            salesmanager.jar = sm.rpJar;
            const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
                first_name: 'Sareh',
                surname: 'Salehi'
            })
            customer._id = customerobj.cid,
                customer.jar = customerobj.rpJar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                $set: {
                    order_lines: [{
                        product_id: mongoose.Types.ObjectId(products[0]._id),
                        campaign_info: {
                            _id: mongoose.Types.ObjectId(),
                            discount_ref: 0
                        },
                        product_instance_id: mongoose.Types.ObjectId(products[0].instances[0]._id),
                        tickets: [{
                            is_processed: false,
                            status: _const.ORDER_LINE_STATUS.Delivered,
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
                            is_processed: false,
                            status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
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
    it('should check when sales manager cancels one orderline ordeline cancel is true', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: salesmanager.jar,
                body: {
                    orderId: orders[0]._id,
                    orderLineId: orderData[0].order_lines[0]._id
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/cancel'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const NorderData = await models()['OrderTest'].find()
            expect(NorderData[0].order_lines[0].cancel).toBe(true)
            expect(NorderData[0].order_lines[1].cancel).toBe(false)
            expect(NorderData[0].tickets[NorderData[0].tickets.length - 1].status).toBe(_const.ORDER_STATUS.WaitForAggregation)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
    it('should check when sales manager cancels the whole order ', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: salesmanager.jar,
                body: {
                    orderId: orders[0]._id
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/cancel'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const NorderData = await models()['OrderTest'].find()
            NorderData[0].order_lines.forEach(OL => {
                expect(OL.cancel).toBe(true)
            });
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
    it('should check when customer cancels one orderline', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: customer.jar,
                body: {
                    orderId: orders[0]._id,
                    orderLineId: orderData[0].order_lines[0]._id
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/cancel'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const NorderData = await models()['OrderTest'].find()
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
    it('should check when customer cancels the whole order', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: customer.jar,
                body: {
                    orderId: orders[0]._id,
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/cancel'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const NorderData = await models()['OrderTest'].find()
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
});