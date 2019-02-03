const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const utils = require('../utils');



describe('POST Order Ticket Scan - send external', () => {
    let orders, products, customer;

    let hubClerk = {
        aid: null,
        jar: null,
    };
    customer = {
        _id: null,
        jar: null,
    }



    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            await models()['WarehouseTest'].insertMany(warehouses)
            hub = warehouses.find(x => x.is_hub);
            const agent = await lib.dbHelpers.addAndLoginAgent('hclerk', _const.ACCESS_LEVEL.HubClerk, hub._id)
            hubClerk.aid = agent.aid;
            hubClerk.jar = agent.rpJar;

            const customerobj = await lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {
                first_name: 'Sareh',
                surname: 'Salehi'
            })
            customer._id = customerobj.cid,
                customer.jar = customerobj.jar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);

            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[1]._id),
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
                    }],
                    delivery_info: {
                        duration_days: 3,
                        delivery_cost: 63000,
                        delivery_discount: 0,
                        delivery_expire_day: new Date(),
                        time_slot: {
                            lower_bound: 10,
                            upper_bound: 14,
                        }
                    }
                }
            });
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('should scan prduct barcode for External delivery for final and change its ticket to checked', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: hubClerk.jar,
                body: {
                    trigger: _const.SCAN_TRIGGER.SendExternal,
                    orderId: orders[1]._id,
                    barcode: '0394081341'
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/ticket/scan'),
                resolveWithFullResponse: true
            });

            expect(res.statusCode).toBe(200)
            const orderData = await models()['OrderTest'].find()
            const order = orderData.find(o => o.order_lines.length)
            expect(order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Checked)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });

    it('should scan product barcode for External delivery and change order ticket to waitforinvoice and OL ticket to checked', async function (done) {
        try {
            this.done = done

            const orderData0 = await models()['OrderTest'].find()
            orderData0[1].order_lines[1].tickets[orderData0[1].order_lines[1].tickets.length - 1].status = _const.ORDER_LINE_STATUS.Checked
            await orderData0[1].save()
            const res = await rp({
                jar: hubClerk.jar,
                body: {
                    trigger: _const.SCAN_TRIGGER.SendExternal,
                    orderId: orders[1]._id,
                    barcode: '0394081341'
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/ticket/scan'),
                resolveWithFullResponse: true
            });

            expect(res.statusCode).toBe(200)
            const orderData = await models()['OrderTest'].find()
            const order = orderData.find(o => o.order_lines.length)
            order.order_lines.forEach(ol => {
                expect(ol.tickets[ol.tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Checked)
            });
            expect(order.tickets[order.tickets.length - 1].status).toBe(_const.ORDER_STATUS.WaitForInvoice)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };

    });

});