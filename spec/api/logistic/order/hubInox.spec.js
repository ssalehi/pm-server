const rp = require('request-promise');
const lib = require('../../../../lib/index');
const models = require('../../../../mongo/models.mongo');
const error = require('../../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../../lib/const.list');
const warehouses = require('../../../../warehouses')
const deliveryDurationInfo = require('../../../../deliveryDurationInfo')
const utils = require('../utils');



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



            products = await utils.makeProducts();
            customer = await utils.makeCustomer();
            orders = await utils.makeOrders();
            orders[0].order_lines[0].tickets[orders[0].order_lines[0].tickets.length - 1].status = _const.ORDER_LINE_STATUS.Delivered
            deliveries = await utils.makeDeliveries()
            done();
        } catch (err) {
            console.log(err);
        };
    }, 15000);
    it('should scan product barcode and change its ticket to recieved and initiates delivery with logged in customer address', async function (done) {
        try {
            customer_id = customer[0]._id
            orders[0].address = customer[0].address
            orders[0].order_lines[0].tickets[0].reciever_id = hubClerk.aid
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
            is_exist = deliveryData.find(delivery => delivery.to.customer._id).order_details[0].order_line_ids.map(id => id.toString()).includes(orders[0].order_lines[0]._id.toString())
            newOLTicketStatus = orderData[0].order_lines[0].tickets[orderData[0].order_lines[0].tickets.length - 1].status
            expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.Recieved)
            expect(orderData[0].tickets[orderData[0].tickets.length - 1].status).toBe(_const.ORDER_STATUS.DeliverySet)
            expect(deliveryData[0].tickets[deliveryData[0].tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.default)
            expect(is_exist).toBe(true)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };

    });


    it('should scan product barcode and change its ticket to recieved and initiates delivery with guest customer address', async function (done) {
        try {
            this.done = done
            const res = await rp({
                jar: hubClerk.jar,
                body: {
                    trigger: _const.SCAN_TRIGGER.Inbox,
                    orderId: orders[0]._id,
                    barcode: '19231213123'
                },
                method: 'POST',
                json: true,
                uri: lib.helpers.apiTestURL('order/ticket/scan'),
                resolveWithFullResponse: true
            });
            expect(res.statusCode).toBe(200)
            const deliveryData = await models()['DeliveryTest'].find()
            const delivery = deliveryData.find(delivery => !delivery.to.warehouse_id && !delivery.to.customer._id)
            const orderData = await models()['OrderTest'].find()
            const order = orderData.find(o => !o.customer_id && o.address)
            is_exist = delivery.order_details[0].order_line_ids.map(id => id.toString()).includes(orders[1].order_lines[0]._id.toString())
            newOLTicketStatus = order.order_lines[0].tickets[orderData[1].order_lines[0].tickets.length - 1].status
            expect(newOLTicketStatus).toBe(_const.ORDER_LINE_STATUS.Recieved)
            expect(delivery.to.customer.address.province).toBe(customer[1].addresses[0].province)
            expect(order.tickets[order.tickets.length - 1].status).toBe(_const.ORDER_STATUS.DeliverySet)
            expect(delivery.tickets[delivery.tickets.length - 1].status).toBe(_const.DELIVERY_STATUS.default)
            expect(is_exist).toBe(true)
            done()
        } catch (err) {
            lib.helpers.errorHandler.bind(this)(err)
        };
    });
});