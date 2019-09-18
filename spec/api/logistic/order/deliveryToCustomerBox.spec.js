const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const utils = require('../utils');

describe('POST Order Ticket Scan - C&C delivery', () => {
    let orders, products;
    ShopClerk = {
        aid: null,
        jar: null,
    }
    customer = {
        _id: null,
        jar: null,
    }


    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            hub = warehouses.find(x => x.is_hub);
            const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => x.name === 'سانا')._id)
            ShopClerk.aid = sclerck.aid;
            ShopClerk.jar = sclerck.rpJar
            const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
                first_name: 'Sareh',
                surname: 'Salehi'
            })
            customer._id = customerobj.cid,
                customer.jar = customerobj.jar
            products = await utils.makeProducts();

            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[2]._id),
            }, {
                $set: {
                    order_lines: {
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
                    }

                }
            });
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[4]._id),
            }, {
                $set: {
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
                            receiver_id: warehouses.find(x => x.name === 'سانا')._id,
                            desc: null,
                            timestamp: new Date(),
                        }]
                    }]

                }
            });
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
                    orderId: orders[2]._id,
                    barcode: '0394081341'
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/ticket/scan'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const orderData = await models()['OrderTest'].find()
            const order = orderData.find(o => o.is_collect && o.customer_id)
            expect(order.tickets[order.tickets.length - 1].status).toBe(_const.ORDER_STATUS.WaitForInvoice)
            expect(order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Checked)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
    it('should scan prduct barcode for CC delivery and change ticket from finalcheck to checked and do not change order ticket ', async function (done) {
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
            expect(orderData[4].order_lines[0].tickets[orderData[4].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Checked)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
    it('should scan prduct barcode for CC delivery and since all products are checked change order ticket to wait for invoice ', async function (done) {
        try {
            this.done = done
            const orderData = await models()['OrderTest'].find()
            orderData[4].order_lines[1].tickets[0].status = _const.ORDER_LINE_STATUS.Checked
            orderData[4].save()
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
            const orderData1 = await models()['OrderTest'].find()
            expect(orderData1[4].tickets[orderData1[4].tickets.length - 1].status).toBe(_const.ORDER_STATUS.WaitForInvoice)
            expect(orderData1[4].order_lines[0].tickets[orderData1[4].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Checked)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
});