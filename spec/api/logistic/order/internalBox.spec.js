const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const utils = require('../utils');


describe('POST Order Ticket Scan - multiple triggers', () => {
    let orders, products, customer;
    ShopClerk = {
        aid: null,
        jar: null,
    }
    internalagent = {
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
            const Iagent = await lib.dbHelpers.addAndLoginAgent('IDelivery Agent', _const.ACCESS_LEVEL.InternalDeliveryAgent)
            internalagent.aid = Iagent.aid
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
            orders = await utils.makeOrders(customer)
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[1]._id),
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
            const orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{ // delivery 0 => internal delivery to hub
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id

                },
                from: {
                    warehouse_id: warehouses.find(x => x.name === 'سانا')._id

                },
                order_details: [{
                    order_line_ids: [
                        orderData[1].order_lines[0]._id
                    ],
                    order_id: orders[1]._id
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
            }]);
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('should scan product barcode for internal send and change OL ticket to ReadyToDeliver', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: ShopClerk.jar,
                body: {
                    trigger: _const.SCAN_TRIGGER.SendInternal,
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
            const order = orderData.find(o => o.address && o.order_lines.length)
            newOLTicketStatus = order.order_lines[0].tickets[order.order_lines[0].tickets.length - 1].status
            expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.ReadyToDeliver)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
});