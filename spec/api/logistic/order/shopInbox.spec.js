const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses');
const moment = require('moment');
const utils = require('../utils');
const deliveryDurationInfo = require('../../../../deliveryDurationInfo')


xdescribe('POST inbox scan - new orderline', () => {
    let orders, products
    ShopClerk = {
        aid: null,
        jar: null,
    }
    let customer = {
        cid: null,
        jar: null
    }
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()

            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer.cid = res.cid;
            customer.jar = res.rpJar;
            const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id)
            ShopClerk.aid = sclerck.aid;
            ShopClerk.jar = sclerck.rpJar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
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
                                _id: mongoose.Types.ObjectId(),
                                status: _const.ORDER_LINE_STATUS.default,
                                desc: null,
                                receiver_id: mongoose.Types.ObjectId(warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id),
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

    it('after scan create orderlines delivery back to centralwarehouse', async function (done) {
        this.done = done
        const res = await rp({
            jar: ShopClerk.jar,
            body: {
                trigger: _const.SCAN_TRIGGER.Inbox,
                orderId: orders[0]._id,
                barcode: '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/ticket/scan'),
            resolveWithFullResponse: true
        })
        expect(res.statusCode).toBe(200)
        NorderData = await models()['OrderTest'].find()
        expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.WaitForOnlineWarehouse)
        done()
    });
});

xdescribe('POST onlineWarehouseResponse(verify)', () => {
    let adminObj = {
        aid: null,
        jar: null,
    };

    let agentObj = {
        aid: null,
        jar: null,
    };

    let orders, products, deliveries, orderData
    let customer = {
        cid: null,
        jar: null
    };
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const agent = await lib.dbHelpers.addAndLoginAgent('DeliveryAgent', _const.ACCESS_LEVEL.DeliveryAgent)
            agentObj.aid = agent.aid;
            agentObj.jar = agent.rpJar;
            const admin = await lib.dbHelpers.addAndLoginAgent('OfflineSystem', _const.ACCESS_LEVEL.OfflineSystem)
            adminObj.aid = admin.aid;
            adminObj.jar = admin.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer.cid = res.cid;
            customer.jar = res.rpJar;
            products = await utils.makeProducts();
            centralId = warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
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
                                _id: mongoose.Types.ObjectId(),
                                status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                                desc: null,
                                timestamp: new Date(),
                            }]
                        }, {
                            product_id: products[0],
                            campaign_info: {
                                _id: mongoose.Types.ObjectId(),
                                discount_ref: 0
                            },
                            product_instance_id: products[0].instances[1]._id,
                            tickets: [{
                                is_processed: false,
                                _id: mongoose.Types.ObjectId(),
                                status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
                                desc: null,
                                timestamp: new Date(),
                            }]
                        }]
                    }
                });
            orderData = await models()['OrderTest'].find()
            deliveries = await models()['DeliveryTest'].insertMany([{
                to: {
                    warehouse_id: warehouses.find(x => x.is_hub)._id
                },
                from: {
                    warehouse_id: warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id

                },
                order_details: [{
                    order_line_ids: [
                        orderData[0].order_lines[1]._id,
                    ],
                    _id: mongoose.Types.ObjectId(),
                    order_id: orderData[0]._id
                }],
                start: new Date(),
                tickets: [{
                    is_processed: false,
                    id: mongoose.Types.ObjectId(),
                    status: _const.DELIVERY_STATUS.default,
                    receiver_id: warehouses[3]._id,
                    timestamp: new Date()
                }],
                "__v": 0
            }]);
            deliveries = JSON.parse(JSON.stringify(deliveries));
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('after online ware house verification new delivery created and orderline ticket is changed to deliveryset', async function (done) {
        this.done = done;
        await models()['DeliveryTest'].deleteMany({});
        const res = await rp({
            jar: adminObj.jar,
            body: {
                orderId: orders[0]._id,
                orderLineId: orderData[0].order_lines[0]._id,
                warehouseId: centralId,
                userId: '5c209119da8a28386c02471b',
                barcode: '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        expect(res.statusCode).toBe(200)
        const deliveries = await models()['DeliveryTest'].find();
        expect(deliveries.length).toBe(1)
        const res1 = await models()['OrderTest'].find()
        let lastTicket = res1[0].order_lines[0].tickets[res1[0].order_lines[0].tickets.length - 1].status;
        expect(lastTicket).toBe(_const.ORDER_LINE_STATUS.DeliverySet)
        done()
    });
    it('after online ware house verification should check the orderline is added to an existing delivery that is being started today ', async function (done) {
        this.done = done
        const res = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[0]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(res.statusCode).toBe(200)
        const deliveryData = await models()['DeliveryTest'].find()
        expect(deliveryData.length).toBe(1)
        isExist = deliveryData[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orderData[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        expect(deliveryData[0].to.warehouse_id.toString()).toBe(warehouses.find(x => x.is_hub)._id.toString())
        done()
    });
    it('after online ware house verification should add the delivery to an existing one that has started few days ago', async function (done) {
        this.done = done;
        const deliveryData = await models()['DeliveryTest'].find()
        deliveryData[0].start = (new Date()).setDate(new Date().getDate() - 3);
        await deliveryData[0].save()
        const res = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[0]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        const deliveryData1 = await models()['DeliveryTest'].find()
        isExist = deliveryData1[0].order_details[0].order_line_ids.map(id => id.toString()).includes(orderData[0].order_lines[0]._id.toString())
        expect(isExist).toBe(true)
        expect(deliveryData1[0].start.getDate()).not.toEqual(new Date().getDate())
        expect(deliveryData1.length).toBe(1)
        done()
    });
    it('after online ware house verification should check when the existing delivery is started creates a new delivery for new orderlines', async function (done) {
        this.done = done
        const deliveryData = await models()['DeliveryTest'].find()
        deliveryData[0].tickets[0].status = _const.DELIVERY_STATUS.started
        deliveryData[0].delivery_start = new Date()
        await deliveryData[0].save()
        const addDelivery = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[1]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081342'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(addDelivery.statusCode).toBe(200)
        const deliveryData2 = await models()['DeliveryTest'].find()
        expect(deliveryData2.length).toBe(2)
        newDelivery = deliveryData2.find(delivery => delivery.tickets[0].status === _const.DELIVERY_STATUS.default)
        let currentDay = moment().format('YYYY-MM-DD');
        expect(moment(newDelivery.start).format('YYYY-MM-DD')).toBe(currentDay)
        done()
    });
    it('should check after onlinewarehouseverification the reserved and count of an inventory are reduced by 1', async function (done) {
        this.done = done
        await utils.changeInventory(products[0]._id, products[0].instances[0]._id, warehouses[1]._id, 0, 1)

        oldProducts = await models()['ProductTest'].find()
        oldReserved = oldProducts[0].instances[0].inventory.find(inv => inv.warehouse_id = warehouses[1]._id).reserved
        const addDelivery = await rp({
            jar: adminObj.jar,
            body: {
                "orderId": orders[0]._id,
                "orderLineId": orderData[0].order_lines[0]._id,
                "warehouseId": centralId,
                "userId": '5c209119da8a28386c02471b',
                "barcode": '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        });
        expect(addDelivery.statusCode).toBe(200)
        const productsData = await models()['ProductTest'].find()
        NewCount = productsData[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === centralId.toString()).count
        NewReserved = productsData[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === centralId.toString()).reserved
        expect(NewCount).toBe(products[0].instances[0].inventory[0].count - 1)
        expect(NewReserved).toBe(oldReserved - 1)
        done()
    });

});

xdescribe('POST inbox scan - canceled orderline', () => {
    let orders, products
    ShopClerk = {
        aid: null,
        jar: null,
    }
    let customer = {
        cid: null,
        jar: null
    }
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()

            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer.cid = res.cid;
            customer.jar = res.rpJar;

            const sclerck = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id)
            ShopClerk.aid = sclerck.aid;
            ShopClerk.jar = sclerck.rpJar
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);
            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                    $set: {
                        order_lines: [{
                            cancel: true,
                            product_id: products[0]._id,
                            campaign_info: {
                                _id: mongoose.Types.ObjectId(),
                                discount_ref: 0
                            },
                            product_instance_id: products[0].instances[0]._id,
                            tickets: [{
                                is_processed: false,
                                _id: mongoose.Types.ObjectId(),
                                status: _const.ORDER_LINE_STATUS.Delivered,
                                desc: null,
                                receiver_id: mongoose.Types.ObjectId(warehouses.find(x => !x.is_hub && !x.has_customer_pickup)._id),
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

    it('after scan create orderlines delivery back to centralwarehouse', async function (done) {
        this.done = done
        const res = await rp({
            jar: ShopClerk.jar,
            body: {
                trigger: _const.SCAN_TRIGGER.Inbox,
                orderId: orders[0]._id,
                barcode: '0394081341'
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/ticket/scan'),
            resolveWithFullResponse: true
        })
        expect(res.statusCode).toBe(200)
        NorderData = await models()['OrderTest'].find()
        expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel)
        done()
    });
});

xdescribe('POST onlineWarehouseResponse(cancel)', () => {
    let adminObj = {
        aid: null,
        jar: null,
    };

    let orders, products, orderData
    let customer = {
        cid: null,
        jar: null
    }
    beforeEach(async done => {
        try {
            await lib.dbHelpers.dropAll()
            const admin = await lib.dbHelpers.addAndLoginAgent('OfflineSystem', _const.ACCESS_LEVEL.OfflineSystem)
            adminObj.aid = admin.aid;
            adminObj.jar = admin.rpJar;
            await models()['WarehouseTest'].insertMany(warehouses)
            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
            });
            customer.cid = res.cid;
            customer.jar = res.rpJar;
            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);

            await models()['OrderTest'].update({
                _id: mongoose.Types.ObjectId(orders[0]._id),
            }, {
                    $set: {
                        order_lines: [{
                            cancel: true,
                            product_id: products[0]._id,
                            campaign_info: {
                                _id: mongoose.Types.ObjectId(),
                                discount_ref: 0
                            },
                            product_instance_id: products[0].instances[0]._id,
                            tickets: [{
                                is_processed: false,
                                _id: mongoose.Types.ObjectId(),
                                status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouseCancel,
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

    it('after online warehouse cancel should check orderline ticket to be canceled', async function (done) {
        this.done = done
        sanaId = warehouses.find(x => x.name === 'سانا')._id.toString()
        const canceled = await rp({
            jar: adminObj.jar,
            body: {
                userId: adminObj.aid,
                orderId: orders[0]._id,
                orderLineId: orderData[0].order_lines[0]._id,
                warehouseId: sanaId,
                barcode: '0394081341',
                reverse: true,
            },
            method: 'POST',
            json: true,
            uri: lib.helpers.apiTestURL('order/offline/onlineWarehouseResponse'),
            resolveWithFullResponse: true
        })
        expect(canceled.statusCode).toBe(200)
        NorderData = await models()['OrderTest'].find()
        expect(NorderData[0].order_lines[0].tickets[NorderData[0].order_lines[0].tickets.length - 1].status).toBe(_const.ORDER_LINE_STATUS.Canceled)
        const NproductsData = await models()['ProductTest'].find()
        NewCount = NproductsData[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === sanaId).count
        prevCount = products[0].instances[0].inventory.find(inv => inv.warehouse_id.toString() === sanaId).count
        expect(NewCount).toBe(prevCount + 1)
        done()
    });
});

describe('lost report', () => {
    let orders, products;
    let customer = {
        _id: null,
        jar: null
    };

    let salesManager = {
        aid: null,
        jar: null
    }

    let shopClerk = {
        aid: null,
        jar: null
    }

    beforeEach(async done => {
        try {

            await lib.dbHelpers.dropAll()

            await models()['DeliveryDurationInfoTest'].insertMany(deliveryDurationInfo)
            await models()['WarehouseTest'].insertMany(warehouses)

            let res = await lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
                first_name: 'test 1',
                surname: 'test 1',
                address: utils.loggedInCustomerAddress
            });

            customer._id = res.cid;
            customer.jar = res.rpJar;

            res = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager);
            salesManager.aid = res.aid;
            salesManager.jar = res.rpJar;

            res = await lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses[1]._id);
            shopClerk.aid = res.aid;
            shopClerk.jar = res.rpJar;

            products = await utils.makeProducts();
            orders = await utils.makeOrders(customer);

            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);

    it('tests lost report of an order line which is not still added to online warehouse and checks for sales manager message', async function (done) {
        try {
            this.done = done;

            orders[0] = await models()['OrderTest'].findOneAndUpdate({
                _id: orders[0]._id
            }, {
                    $set: {
                        order_lines: [
                            {
                                product_price: 0,
                                paid_price: 0,
                                cancel: false,
                                product_id: products[0]._id,
                                product_instance_id: products[0].instances[0]._id,
                                tickets: [
                                    {
                                        receiver_id: warehouses[0]._id,
                                        is_processed: false,
                                        status: _const.ORDER_LINE_STATUS.default
                                    }
                                ]
                            }
                        ]
                    }

                }, {new: true});

            res = await rp({
                method: 'POST',
                uri: lib.helpers.apiTestURL(`order/lost`),
                body: {
                    orderId: orders[0]._id,
                    orderLineId: orders[0].order_lines[0]._id,
                },
                method: 'POST',
                jar: shopClerk.jar,
                json: true,
                resolveWithFullResponse: true,
            });
            expect(res.statusCode).toBe(200);

            let foundMessage = await models()['SMMessageTest'].findOne({});
            expect(foundMessage.order_id.toString()).toBe(orders[0]._id.toString());
            expect(foundMessage.order_line_id.toString()).toBe(orders[0].order_lines[0]._id.toString());
            expect(foundMessage.type).toBe(_const.SM_MESSAGE.Lost);
            expect(foundMessage.extra.warehouseId).toBe(warehouses[1]._id.toString());

            let foundOrder = await models()['OrderTest'].findOne({
                _id: orders[0]._id
            });

            expect(foundOrder.order_lines[0].tickets.length).toBe(2);

            let waitForLost = foundOrder.order_lines[0].tickets[1];
            expect(waitForLost.status).toBe(_const.ORDER_LINE_STATUS.WaitForLostWarehouse);
            expect(waitForLost.receiver_id.toString()).toBe(warehouses[1]._id.toString());

            done();
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });

    it('tests verification of lost report by offline warehouse and new inventrory data if order line was not added to online warehouse before lost report', async function (done) {
        try {
            this.done = done;

            orders[0] = await models()['OrderTest'].findOneAndUpdate({
                _id: orders[0]._id
            }, {
                    $set: {
                        order_lines: [
                            {
                                product_price: 0,
                                paid_price: 0,
                                cancel: false,
                                product_id: products[0]._id,
                                product_instance_id: products[0].instances[0]._id,
                                tickets: [
                                    {
                                        receiver_id: warehouses[0]._id,
                                        is_processed: false,
                                        status: _const.ORDER_LINE_STATUS.WaitForLostWarehouse
                                    }
                                ]
                            }
                        ]
                    }

                }, {new: true});

            res = await rp({
                method: 'POST',
                uri: lib.helpers.apiTestURL(`order/lost`),
                body: {
                    orderId: orders[0]._id,
                    orderLineId: orders[0].order_lines[0]._id,
                },
                method: 'POST',
                jar: shopClerk.jar,
                json: true,
                resolveWithFullResponse: true,
            });
            expect(res.statusCode).toBe(200);

            let foundMessage = await models()['SMMessageTest'].findOne({});
            expect(foundMessage.order_id.toString()).toBe(orders[0]._id.toString());
            expect(foundMessage.order_line_id.toString()).toBe(orders[0].order_lines[0]._id.toString());
            expect(foundMessage.type).toBe(_const.SM_MESSAGE.Lost);
            expect(foundMessage.extra.warehouseId).toBe(warehouses[1]._id.toString());

            let foundOrder = await models()['OrderTest'].findOne({
                _id: orders[0]._id
            });

            expect(foundOrder.order_lines[0].tickets.length).toBe(2);

            let waitForLost = foundOrder.order_lines[0].tickets[1];
            expect(waitForLost.status).toBe(_const.ORDER_LINE_STATUS.WaitForLostWarehouse);
            expect(waitForLost.receiver_id.toString()).toBe(warehouses[1]._id.toString());

            done();
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });

});